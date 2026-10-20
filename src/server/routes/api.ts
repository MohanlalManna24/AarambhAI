import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { dbStore, newObjectId, hashToken, UserDoc } from '../db/store.js';
import { getDatabaseStatus } from '../config/database.js';
import {
  AppError,
  authenticate,
  requireRole,
  verifyEventAccess,
  setAuthCookies,
  clearAuthCookies,
  authRateLimiter,
  aiRateLimiter,
  SESSION_COOKIE_NAME,
  generateCsrfToken,
  signSessionToken,
  timingSafeTokenMatch,
} from '../middleware/security.js';
import {
  RegisterSchema,
  LoginSchema,
  VerifyEmailSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  UpdateProfileSchema,
  CreateEventSchema,
  UpdateEventSchema,
  GenerateAiPlanRequestSchema,
  PersonalizedIdeasRequestSchema,
  CreateBudgetCategorySchema,
  CreateExpenseSchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  CreateEventVendorSchema,
  UpdateEventVendorSchema,
  CreateGuestSchema,
  UpdateGuestSchema,
  BulkGuestImportSchema,
  AdminUpdateUserSchema,
  AdminUpdateConfigSchema,
  AdminUpdateAbuseReportSchema,
  computeEventBudgetSummary,
  sanitizeCsvCell,
} from '../validators/schemas.js';
import {
  generateStructuredEventPlan,
  generatePersonalizedEventIdeas,
} from '../services/ai-planner.service.js';
import { env } from '../config/env.js';

export const apiRouter = Router();

function serializeUser(user: UserDoc) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
    status: user.status,
    phone: user.phone,
    city: user.city,
    preferredCurrency: user.preferredCurrency,
    privacySettings: user.privacySettings,
    aiDailyCount: user.aiDailyCount,
    aiDailyQuota: dbStore.collections.platformConfig.aiDailyQuotaPerUser || env.AI_DAILY_QUOTA_PER_USER,
    createdAt: user.createdAt,
  };
}

// ============================================================================
// 1. HEALTH & READINESS ENDPOINTS
// ============================================================================

apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

apiRouter.get('/ready', (_req: Request, res: Response) => {
  const db = getDatabaseStatus();
  res.json({
    success: true,
    status: 'ready',
    database: db,
    aiProviderConfigured: Boolean(process.env.GEMINI_API_KEY || env.EFFECTIVE_GEMINI_KEY),
  });
});

// ============================================================================
// 2. AUTHENTICATION & ACCOUNT MANAGEMENT
// ============================================================================

apiRouter.post('/auth/register', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!dbStore.collections.platformConfig.allowNewRegistrations) {
      throw new AppError(403, 'REGISTRATIONS_CLOSED', 'New account registrations are temporarily paused by administrator.');
    }

    const input = RegisterSchema.parse(req.body);
    const existing = dbStore.collections.users.find((u) => u.email === input.email);
    if (existing) {
      // Generic message to reduce account enumeration
      throw new AppError(409, 'REGISTRATION_CONFLICT', 'Unable to register with the provided email address.');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const rawVerificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenHash = hashToken(rawVerificationToken);
    const now = new Date().toISOString();

    const newUser: UserDoc = {
      _id: newObjectId(),
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'customer',
      emailVerified: false,
      verificationTokenHash,
      verificationExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      resetTokenHash: null,
      resetExpiresAt: null,
      sessionVersion: 1,
      status: 'active',
      phone: input.phone,
      city: input.city,
      preferredCurrency: 'INR',
      privacySettings: {
        shareAnalytics: false,
        emailNotifications: true,
        marketingOptIn: false,
      },
      aiDailyCount: 0,
      aiLastResetDate: now.slice(0, 10),
      createdAt: now,
      updatedAt: now,
    };

    dbStore.collections.users.push(newUser);
    dbStore.logAudit({
      actorUserId: newUser._id,
      actorRole: newUser.role,
      action: 'USER_REGISTERED',
      targetType: 'User',
      targetId: newUser._id,
      ipAddress: req.ip || '127.0.0.1',
      requestId: req.requestId || '',
      metadata: { city: newUser.city },
    });

    const { csrfToken, sessionToken } = setAuthCookies(res, newUser);

    res.status(201).json({
      success: true,
      data: {
        user: serializeUser(newUser),
        csrfToken,
        sessionToken,
        // Provided when EMAIL_PROVIDER=console so email verification is 100% functional in dev/preview
        verificationPreviewToken: env.EMAIL_PROVIDER === 'console' ? rawVerificationToken : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/auth/login', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = LoginSchema.parse(req.body);
    const user = dbStore.collections.users.find((u) => u.email === input.email && u.status !== 'deleted');

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (user.status === 'suspended') {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended. Please contact platform support.');
    }

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) {
      dbStore.logAudit({
        actorUserId: user._id,
        actorRole: user.role,
        action: 'USER_LOGIN_FAILED',
        targetType: 'User',
        targetId: user._id,
        ipAddress: req.ip || '127.0.0.1',
        requestId: req.requestId || '',
        metadata: {},
      });
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    // Rotate session version on new login if desired or keep active multi-device
    const { csrfToken, sessionToken } = setAuthCookies(res, user);

    dbStore.logAudit({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'USER_LOGIN_SUCCESS',
      targetType: 'User',
      targetId: user._id,
      ipAddress: req.ip || '127.0.0.1',
      requestId: req.requestId || '',
      metadata: {},
    });

    res.json({
      success: true,
      data: {
        user: serializeUser(user),
        csrfToken,
        sessionToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/auth/verify-email', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = VerifyEmailSchema.parse(req.body);
    const user = req.user!;

    if (user.emailVerified) {
      res.json({ success: true, data: { user: serializeUser(user), message: 'Email is already verified.' } });
      return;
    }

    const tokenHash = hashToken(token);
    const isExpired =
      !user.verificationExpiresAt || new Date(user.verificationExpiresAt).getTime() < Date.now();

    if (!user.verificationTokenHash || !timingSafeTokenMatch(user.verificationTokenHash, tokenHash) || isExpired) {
      throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'Verification code is invalid or has expired.');
    }

    user.emailVerified = true;
    user.verificationTokenHash = null;
    user.verificationExpiresAt = null;
    user.updatedAt = new Date().toISOString();
    dbStore.logAudit({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'EMAIL_VERIFIED',
      targetType: 'User',
      targetId: user._id,
      ipAddress: req.ip || '127.0.0.1',
      requestId: req.requestId || '',
      metadata: {},
    });

    res.json({
      success: true,
      data: {
        user: serializeUser(user),
        message: 'Email verified successfully.',
      },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/auth/resend-verification', authenticate, authRateLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const rawToken = crypto.randomBytes(20).toString('hex');
    user.verificationTokenHash = hashToken(rawToken);
    user.verificationExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    user.updatedAt = new Date().toISOString();
    dbStore.save();

    res.json({
      success: true,
      data: {
        message: 'Verification token generated.',
        verificationPreviewToken: env.EMAIL_PROVIDER === 'console' ? rawToken : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/auth/forgot-password', authRateLimiter, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = ForgotPasswordSchema.parse(req.body);
    const user = dbStore.collections.users.find((u) => u.email === email && u.status === 'active');

    let resetPreviewToken: string | undefined;
    if (user) {
      const rawToken = crypto.randomBytes(20).toString('hex');
      user.resetTokenHash = hashToken(rawToken);
      user.resetExpiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString(); // 30 minutes
      user.updatedAt = new Date().toISOString();
      dbStore.logAudit({
        actorUserId: user._id,
        actorRole: user.role,
        action: 'PASSWORD_RESET_REQUESTED',
        targetType: 'User',
        targetId: user._id,
        ipAddress: req.ip || '127.0.0.1',
        requestId: req.requestId || '',
        metadata: {},
      });
      if (env.EMAIL_PROVIDER === 'console') {
        resetPreviewToken = rawToken;
      }
    }

    // Always return identical generic message to prevent email enumeration
    res.json({
      success: true,
      data: {
        message: 'If an active account exists with that email, a single-use password recovery token has been issued.',
        resetPreviewToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/auth/reset-password', authRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = ResetPasswordSchema.parse(req.body);
    const tokenHash = hashToken(token);

    const user = dbStore.collections.users.find(
      (u) =>
        Boolean(u.resetTokenHash) &&
        timingSafeTokenMatch(u.resetTokenHash!, tokenHash) &&
        Boolean(u.resetExpiresAt) &&
        new Date(u.resetExpiresAt!).getTime() > Date.now() &&
        u.status === 'active'
    );

    if (!user) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Password reset token is invalid or has expired.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetTokenHash = null;
    user.resetExpiresAt = null;
    // Increment sessionVersion to immediately invalidate all prior sessions/tokens
    user.sessionVersion += 1;
    user.updatedAt = new Date().toISOString();

    dbStore.logAudit({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      targetType: 'User',
      targetId: user._id,
      ipAddress: req.ip || '127.0.0.1',
      requestId: req.requestId || '',
      metadata: {},
    });

    clearAuthCookies(res);
    res.json({
      success: true,
      data: {
        message: 'Password has been reset and existing sessions have been invalidated. Please sign in.',
      },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.post('/auth/logout', authenticate, (req: Request, res: Response) => {
  const user = req.user!;
  user.sessionVersion += 1;
  user.updatedAt = new Date().toISOString();
  dbStore.logAudit({
    actorUserId: user._id,
    actorRole: user.role,
    action: 'USER_LOGOUT',
    targetType: 'User',
    targetId: user._id,
    ipAddress: req.ip || '127.0.0.1',
    requestId: req.requestId || '',
    metadata: {},
  });
  clearAuthCookies(res);
  res.json({ success: true, data: { message: 'Logged out and session revoked.' } });
});

apiRouter.get('/auth/me', authenticate, (req: Request, res: Response) => {
  const user = req.user!;
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME] || signSessionToken(user);
  const csrfToken = generateCsrfToken(cookieToken);

  res.json({
    success: true,
    data: {
      user: serializeUser(user),
      csrfToken,
    },
  });
});

apiRouter.patch('/users/me', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateProfileSchema.parse(req.body);
    const user = req.user!;

    if (input.name !== undefined) user.name = input.name;
    if (input.phone !== undefined) user.phone = input.phone;
    if (input.city !== undefined) user.city = input.city;
    if (input.preferredCurrency !== undefined) user.preferredCurrency = input.preferredCurrency;
    if (input.privacySettings !== undefined) {
      user.privacySettings = {
        ...user.privacySettings,
        ...input.privacySettings,
      };
    }
    user.updatedAt = new Date().toISOString();
    dbStore.save();

    res.json({
      success: true,
      data: { user: serializeUser(user) },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/users/me/export', authenticate, (req: Request, res: Response) => {
  const user = req.user!;
  const myEvents = dbStore.collections.events.filter((e) => e.ownerId === user._id);
  const myEventIds = new Set(myEvents.map((e) => e._id));

  const payload = {
    exportedAt: new Date().toISOString(),
    profile: serializeUser(user),
    events: myEvents,
    budgetCategories: dbStore.collections.budgetCategories.filter((b) => myEventIds.has(b.eventId)),
    expenses: dbStore.collections.expenses.filter((x) => myEventIds.has(x.eventId)),
    tasks: dbStore.collections.tasks.filter((t) => myEventIds.has(t.eventId)),
    vendors: dbStore.collections.eventVendors.filter((v) => myEventIds.has(v.eventId)),
    guests: dbStore.collections.guests.filter((g) => myEventIds.has(g.eventId)),
  };

  res.json({ success: true, data: payload });
});

apiRouter.delete('/users/me', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    dbStore.transaction((cols) => {
      const ownedEventIds = new Set(cols.events.filter((e) => e.ownerId === user._id).map((e) => e._id));
      cols.events = cols.events.filter((e) => e.ownerId !== user._id);
      cols.memberships = cols.memberships.filter((m) => !ownedEventIds.has(m.eventId) && m.userId !== user._id);
      cols.budgetCategories = cols.budgetCategories.filter((b) => !ownedEventIds.has(b.eventId));
      cols.expenses = cols.expenses.filter((x) => !ownedEventIds.has(x.eventId));
      cols.tasks = cols.tasks.filter((t) => !ownedEventIds.has(t.eventId));
      cols.eventVendors = cols.eventVendors.filter((v) => !ownedEventIds.has(v.eventId));
      cols.guests = cols.guests.filter((g) => !ownedEventIds.has(g.eventId));
      cols.aiGenerations = cols.aiGenerations.filter((a) => !ownedEventIds.has(a.eventId));
      cols.users = cols.users.filter((u) => u._id !== user._id);
    });

    clearAuthCookies(res);
    res.json({
      success: true,
      data: { message: 'Account and all associated personal event records have been permanently deleted.' },
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. EVENTS CRUD & COLLABORATOR ACCESS
// ============================================================================

apiRouter.get('/events', authenticate, (req: Request, res: Response) => {
  const userId = req.user!._id;
  const memberEventIds = new Set(
    dbStore.collections.memberships
      .filter((m) => m.userId === userId && m.status === 'active')
      .map((m) => m.eventId)
  );

  const userEvents = dbStore.collections.events.filter(
    (e) => e.ownerId === userId || memberEventIds.has(e._id)
  );

  // Pre-index child records by eventId in O(N) single pass for high efficiency
  const categoriesByEvent = new Map<string, typeof dbStore.collections.budgetCategories>();
  for (const c of dbStore.collections.budgetCategories) {
    const list = categoriesByEvent.get(c.eventId);
    if (list) list.push(c);
    else categoriesByEvent.set(c.eventId, [c]);
  }

  const expensesByEvent = new Map<string, typeof dbStore.collections.expenses>();
  for (const x of dbStore.collections.expenses) {
    const list = expensesByEvent.get(x.eventId);
    if (list) list.push(x);
    else expensesByEvent.set(x.eventId, [x]);
  }

  const vendorsByEvent = new Map<string, typeof dbStore.collections.eventVendors>();
  for (const v of dbStore.collections.eventVendors) {
    const list = vendorsByEvent.get(v.eventId);
    if (list) list.push(v);
    else vendorsByEvent.set(v.eventId, [v]);
  }

  const tasksByEvent = new Map<string, typeof dbStore.collections.tasks>();
  for (const t of dbStore.collections.tasks) {
    const list = tasksByEvent.get(t.eventId);
    if (list) list.push(t);
    else tasksByEvent.set(t.eventId, [t]);
  }

  const guestsByEvent = new Map<string, typeof dbStore.collections.guests>();
  for (const g of dbStore.collections.guests) {
    const list = guestsByEvent.get(g.eventId);
    if (list) list.push(g);
    else guestsByEvent.set(g.eventId, [g]);
  }

  const enriched = userEvents.map((ev) => {
    const categories = categoriesByEvent.get(ev._id) || [];
    const expenses = expensesByEvent.get(ev._id) || [];
    const vendors = vendorsByEvent.get(ev._id) || [];
    const tasks = tasksByEvent.get(ev._id) || [];
    const guests = guestsByEvent.get(ev._id) || [];
    const budgetSummary = computeEventBudgetSummary(ev, categories, expenses, vendors);

    const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
    const confirmedGuestHeadcount = guests
      .filter((g) => g.rsvpStatus === 'confirmed')
      .reduce((acc, g) => acc + g.headcount, 0);

    return {
      ...ev,
      summary: {
        totalActualExpensesPaise: budgetSummary.totalActualExpensesPaise,
        utilizationPercent: budgetSummary.utilizationPercent,
        isOverBudget: budgetSummary.isTotalOverAllocatable || budgetSummary.overBudgetCategoriesCount > 0,
        tasksTotal: tasks.length,
        tasksCompleted: completedTasksCount,
        vendorsTotal: vendors.length,
        vendorsBooked: vendors.filter((v) => v.status === 'booked' || v.status === 'completed').length,
        confirmedGuestHeadcount,
        totalGuestRecords: guests.length,
      },
    };
  });

  res.json({
    success: true,
    data: { events: enriched },
  });
});

apiRouter.post('/events', authenticate, (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateEventSchema.parse(req.body);
    const user = req.user!;
    const now = new Date().toISOString();
    const eventId = newObjectId();

    const createdEvent = dbStore.transaction((cols) => {
      // Never trust client-supplied ownerId; enforce authenticated user._id
      const newEvent = {
        _id: eventId,
        ownerId: user._id,
        title: input.title,
        eventType: input.eventType,
        startDate: input.startDate,
        endDate: input.endDate,
        timezone: input.timezone,
        city: input.city,
        venueName: input.venueName,
        venueAddress: input.venueAddress,
        indoorOutdoor: input.indoorOutdoor,
        estimatedGuests: input.estimatedGuests,
        totalBudgetPaise: input.totalBudgetPaise,
        emergencyReservePaise: input.emergencyReservePaise,
        currency: input.currency,
        theme: input.theme,
        preferredStyle: input.preferredStyle,
        dietaryRequirements: input.dietaryRequirements,
        accessibilityRequirements: input.accessibilityRequirements,
        culturalPreferences: input.culturalPreferences,
        specialInstructions: input.specialInstructions,
        planningStatus: input.planningStatus,
        approvedAiPlanId: null,
        createdAt: now,
        updatedAt: now,
      };

      cols.events.unshift(newEvent);

      // Seed default structured budget categories based on allocatable budget
      const allocatable = Math.max(0, input.totalBudgetPaise - input.emergencyReservePaise);
      const defaultSplits = [
        { name: 'Venue & Space Rental', ratio: 0.35 },
        { name: 'Catering & Culinary Stations', ratio: 0.28 },
        { name: 'Decor, Florals & Lighting', ratio: 0.16 },
        { name: 'Photography & Cinematography', ratio: 0.1 },
        { name: 'Music, Entertainment & AV', ratio: 0.06 },
        { name: 'Hospitality & Guest Logistics', ratio: 0.05 },
      ];

      for (const split of defaultSplits) {
        cols.budgetCategories.push({
          _id: newObjectId(),
          eventId,
          ownerId: user._id,
          name: split.name,
          plannedAmountPaise: Math.round(allocatable * split.ratio),
          isAiEstimated: false,
          notes: 'Initial wizard allocation',
          createdAt: now,
          updatedAt: now,
        });
      }

      // Seed initial milestone tasks
      const startMs = new Date(input.startDate).getTime();
      const dayMs = 86400 * 1000;
      cols.tasks.push(
        {
          _id: newObjectId(),
          eventId,
          ownerId: user._id,
          title: `Confirm venue contract & power backup in ${input.city}`,
          description: `Finalize booking terms for ${input.venueName || input.city} (${input.estimatedGuests} guests).`,
          category: 'venue',
          priority: 'critical',
          status: 'todo',
          dueDate: new Date(Math.max(Date.now() + dayMs, startMs - 30 * dayMs)).toISOString(),
          isEventDayRunSheet: false,
          runSheetTime: '',
          assignedToName: user.name,
          dependsOnTaskIds: [],
          reminderEnabled: true,
          createdAt: now,
          updatedAt: now,
        },
        {
          _id: newObjectId(),
          eventId,
          ownerId: user._id,
          title: `Lock catering tasting menu (${input.dietaryRequirements.join(', ') || 'Standard'})`,
          description: 'Verify separate dietary counters and servingware hygiene.',
          category: 'catering',
          priority: 'high',
          status: 'todo',
          dueDate: new Date(Math.max(Date.now() + 2 * dayMs, startMs - 20 * dayMs)).toISOString(),
          isEventDayRunSheet: false,
          runSheetTime: '',
          assignedToName: user.name,
          dependsOnTaskIds: [],
          reminderEnabled: true,
          createdAt: now,
          updatedAt: now,
        }
      );

      return newEvent;
    });

    dbStore.logAudit({
      actorUserId: user._id,
      actorRole: user.role,
      action: 'EVENT_CREATED',
      targetType: 'Event',
      targetId: createdEvent._id,
      ipAddress: req.ip || '127.0.0.1',
      requestId: req.requestId || '',
      metadata: { title: createdEvent.title, eventType: createdEvent.eventType },
    });

    res.status(201).json({
      success: true,
      data: { event: createdEvent },
    });
  } catch (err) {
    next(err);
  }
});

apiRouter.get('/events/:eventId', authenticate, verifyEventAccess('read'), (req: Request, res: Response) => {
  const event = req.authorizedEvent!;
  const categories = dbStore.collections.budgetCategories.filter((c) => c.eventId === event._id);
  const expenses = dbStore.collections.expenses.filter((x) => x.eventId === event._id);
  const tasks = dbStore.collections.tasks.filter((t) => t.eventId === event._id);
  const vendors = dbStore.collections.eventVendors.filter((v) => v.eventId === event._id);
  const guests = dbStore.collections.guests.filter((g) => g.eventId === event._id);
  const aiPlans = dbStore.collections.aiGenerations.filter((a) => a.eventId === event._id);
  const memberships = dbStore.collections.memberships.filter((m) => m.eventId === event._id);

  const budgetSummary = computeEventBudgetSummary(event, categories, expenses, vendors);

  res.json({
    success: true,
    data: {
      event,
      accessRole: req.eventRole,
      budgetSummary,
      categories,
      expenses,
      tasks,
      vendors,
      guests,
      aiPlans,
      memberships,
    },
  });
});

apiRouter.patch('/events/:eventId', authenticate, verifyEventAccess('owner_only'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateEventSchema.parse(req.body);
    const event = req.authorizedEvent!;

    Object.assign(event, input, { updatedAt: new Date().toISOString() });
    dbStore.save();

    dbStore.logAudit({
      actorUserId: req.user!._id,
      actorRole: req.user!.role,
      action: 'EVENT_UPDATED',
      targetType: 'Event',
      targetId: event._id,
      ipAddress: req.ip || '127.0.0.1',
      requestId: req.requestId || '',
      metadata: { updatedFields: Object.keys(input) },
    });

    res.json({ success: true, data: { event } });
  } catch (err) {
    next(err);
  }
});

apiRouter.delete('/events/:eventId', authenticate, verifyEventAccess('owner_only'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = req.authorizedEvent!;
    dbStore.transaction((cols) => {
      cols.events = cols.events.filter((e) => e._id !== event._id);
      cols.memberships = cols.memberships.filter((m) => m.eventId !== event._id);
      cols.budgetCategories = cols.budgetCategories.filter((b) => b.eventId !== event._id);
      cols.expenses = cols.expenses.filter((x) => x.eventId !== event._id);
      cols.tasks = cols.tasks.filter((t) => t.eventId !== event._id);
      cols.eventVendors = cols.eventVendors.filter((v) => v.eventId !== event._id);
      cols.guests = cols.guests.filter((g) => g.eventId !== event._id);
      cols.aiGenerations = cols.aiGenerations.filter((a) => a.eventId !== event._id);
    });

    dbStore.logAudit({
      actorUserId: req.user!._id,
      actorRole: req.user!.role,
      action: 'EVENT_DELETED',
      targetType: 'Event',
      targetId: event._id,
      ipAddress: req.ip || '127.0.0.1',
      requestId: req.requestId || '',
      metadata: { title: event.title },
    });

    res.json({ success: true, data: { message: 'Event and related records deleted.' } });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 4. AI EVENT PLANNING WORKSPACE & PERSONALIZED IDEAS
// ============================================================================

apiRouter.get('/events/:eventId/ai-plans', authenticate, verifyEventAccess('read'), (req: Request, res: Response) => {
  const plans = dbStore.collections.aiGenerations.filter((a) => a.eventId === req.authorizedEvent!._id);
  res.json({ success: true, data: { aiPlans: plans } });
});

apiRouter.post(
  '/events/:eventId/ai-plans/generate',
  authenticate,
  aiRateLimiter,
  verifyEventAccess('owner_only'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = GenerateAiPlanRequestSchema.parse(req.body);
      const generation = await generateStructuredEventPlan(req.user!, req.authorizedEvent!, options);

      dbStore.logAudit({
        actorUserId: req.user!._id,
        actorRole: req.user!.role,
        action: 'AI_PLAN_GENERATED',
        targetType: 'AiPlanGeneration',
        targetId: generation._id,
        ipAddress: req.ip || '127.0.0.1',
        requestId: req.requestId || '',
        metadata: { eventId: req.authorizedEvent!._id, modelName: generation.modelName },
      });

      res.status(201).json({
        success: true,
        data: { generation },
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * Explicit user approval required to apply an AI-generated plan to the event's budget categories and checklist.
 * Never overwrites confirmed vendor invoices or existing expenses.
 */
apiRouter.post(
  '/events/:eventId/ai-plans/:planId/apply',
  authenticate,
  verifyEventAccess('owner_only'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = req.authorizedEvent!;
      const planId = req.params.planId;
      const planDoc = dbStore.collections.aiGenerations.find(
        (p) => p._id === planId && p.eventId === event._id && p.structuredPlan
      );

      if (!planDoc) {
        throw new AppError(404, 'AI_PLAN_NOT_FOUND', 'The specified AI plan was not found for this event.');
      }

      const plan = planDoc.structuredPlan;
      const now = new Date().toISOString();

      dbStore.transaction((cols) => {
        // Add or update AI-estimated budget categories without deleting categories that have real expenses
        for (const item of plan.budgetAllocation || []) {
          if (item.category.toLowerCase().includes('emergency reserve')) continue;
          const amountPaise = Math.round(Number(item.amountInr || 0) * 100);
          const existingCat = cols.budgetCategories.find(
            (c) => c.eventId === event._id && c.name.toLowerCase() === String(item.category).toLowerCase()
          );
          if (existingCat) {
            existingCat.plannedAmountPaise = amountPaise;
            existingCat.isAiEstimated = true;
            existingCat.notes = String(item.rationale || existingCat.notes);
            existingCat.updatedAt = now;
          } else {
            cols.budgetCategories.push({
              _id: newObjectId(),
              eventId: event._id,
              ownerId: req.user!._id,
              name: String(item.category).slice(0, 80),
              plannedAmountPaise: amountPaise,
              isAiEstimated: true,
              notes: String(item.rationale || 'AI Blueprint allocation').slice(0, 400),
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        // Add proposed checklist tasks that do not already exist
        const startMs = new Date(event.startDate).getTime();
        for (const taskItem of plan.taskChecklist || []) {
          const exists = cols.tasks.some(
            (t) => t.eventId === event._id && t.title.toLowerCase() === String(taskItem.title).toLowerCase()
          );
          if (!exists) {
            const daysPrior = Number(taskItem.daysBeforeEvent || 14);
            const dueMs = Math.max(Date.now() + 86400000, startMs - daysPrior * 86400000);
            cols.tasks.push({
              _id: newObjectId(),
              eventId: event._id,
              ownerId: req.user!._id,
              title: String(taskItem.title).slice(0, 160),
              description: 'Added from approved AI Event Blueprint',
              category: 'logistics',
              priority: ['low', 'medium', 'high', 'critical'].includes(taskItem.priority)
                ? taskItem.priority
                : 'medium',
              status: 'todo',
              dueDate: new Date(dueMs).toISOString(),
              isEventDayRunSheet: false,
              runSheetTime: '',
              assignedToName: req.user!.name,
              dependsOnTaskIds: [],
              reminderEnabled: true,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        // Add event-day schedule items as run-sheet tasks
        for (const slot of plan.eventDaySchedule || []) {
          const runTitle = `Run Sheet: ${slot.activity}`;
          const exists = cols.tasks.some(
            (t) => t.eventId === event._id && t.title.toLowerCase() === runTitle.toLowerCase()
          );
          if (!exists) {
            cols.tasks.push({
              _id: newObjectId(),
              eventId: event._id,
              ownerId: req.user!._id,
              title: runTitle.slice(0, 160),
              description: `Owner: ${slot.owner}`,
              category: 'run_sheet',
              priority: 'high',
              status: 'todo',
              dueDate: event.startDate,
              isEventDayRunSheet: true,
              runSheetTime: String(slot.timeSlot).slice(0, 40),
              assignedToName: String(slot.owner).slice(0, 80),
              dependsOnTaskIds: [],
              reminderEnabled: true,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        planDoc.status = 'applied';
        planDoc.appliedAt = now;
        planDoc.updatedAt = now;
        event.approvedAiPlanId = planDoc._id;
        event.updatedAt = now;
      });

      dbStore.logAudit({
        actorUserId: req.user!._id,
        actorRole: req.user!.role,
        action: 'AI_PLAN_APPLIED',
        targetType: 'AiPlanGeneration',
        targetId: planDoc._id,
        ipAddress: req.ip || '127.0.0.1',
        requestId: req.requestId || '',
        metadata: { eventId: event._id },
      });

      res.json({
        success: true,
        data: {
          message: 'AI Plan approved and synced to your budget categories, checklist, and event-day run sheet.',
          generation: planDoc,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/events/:eventId/personalized-ideas',
  authenticate,
  aiRateLimiter,
  verifyEventAccess('read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { focusCategory, customContext } = PersonalizedIdeasRequestSchema.parse(req.body);
      const ideas = await generatePersonalizedEventIdeas(
        req.user!,
        req.authorizedEvent!,
        focusCategory,
        customContext
      );
      res.json({ success: true, data: { ideas } });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================================
// 5. SMART BUDGET & EXPENSE MANAGEMENT (PAISE-ACCURATE)
// ============================================================================

apiRouter.get('/events/:eventId/budget', authenticate, verifyEventAccess('read'), (req: Request, res: Response) => {
  const event = req.authorizedEvent!;
  const categories = dbStore.collections.budgetCategories.filter((c) => c.eventId === event._id);
  const expenses = dbStore.collections.expenses.filter((x) => x.eventId === event._id);
  const vendors = dbStore.collections.eventVendors.filter((v) => v.eventId === event._id);

  const summary = computeEventBudgetSummary(event, categories, expenses, vendors);

  res.json({
    success: true,
    data: {
      summary,
      categories,
      expenses,
    },
  });
});

apiRouter.post(
  '/events/:eventId/budget/categories',
  authenticate,
  verifyEventAccess('budget:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateBudgetCategorySchema.parse(req.body);
      const event = req.authorizedEvent!;
      const duplicate = dbStore.collections.budgetCategories.some(
        (c) => c.eventId === event._id && c.name.toLowerCase() === input.name.toLowerCase()
      );
      if (duplicate) {
        throw new AppError(409, 'CATEGORY_EXISTS', 'A budget category with this name already exists for this event.');
      }

      const now = new Date().toISOString();
      const cat = {
        _id: newObjectId(),
        eventId: event._id,
        ownerId: event.ownerId,
        name: input.name,
        plannedAmountPaise: input.plannedAmountPaise,
        isAiEstimated: input.isAiEstimated,
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };

      dbStore.collections.budgetCategories.push(cat);
      dbStore.save();

      res.status(201).json({ success: true, data: { category: cat } });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/events/:eventId/budget/expenses',
  authenticate,
  verifyEventAccess('budget:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateExpenseSchema.parse(req.body);
      const event = req.authorizedEvent!;

      const category = dbStore.collections.budgetCategories.find(
        (c) => c._id === input.categoryId && c.eventId === event._id
      );
      if (!category) {
        throw new AppError(400, 'INVALID_CATEGORY', 'Selected budget category does not belong to this event.');
      }

      const now = new Date().toISOString();
      const expense = dbStore.transaction((cols) => {
        const exp = {
          _id: newObjectId(),
          eventId: event._id,
          ownerId: event.ownerId,
          categoryId: category._id,
          categoryName: category.name,
          title: input.title,
          vendorName: input.vendorName,
          amountPaise: input.amountPaise,
          advancePaidPaise: input.advancePaidPaise,
          paymentStatus: input.paymentStatus,
          priceType: input.priceType,
          expenseDate: input.expenseDate || now,
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        };
        cols.expenses.unshift(exp);
        return exp;
      });

      res.status(201).json({ success: true, data: { expense } });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.delete(
  '/events/:eventId/budget/expenses/:expenseId',
  authenticate,
  verifyEventAccess('budget:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = req.authorizedEvent!;
      const idx = dbStore.collections.expenses.findIndex(
        (x) => x._id === req.params.expenseId && x.eventId === event._id
      );
      if (idx === -1) {
        throw new AppError(404, 'EXPENSE_NOT_FOUND', 'Expense record not found.');
      }
      dbStore.collections.expenses.splice(idx, 1);
      dbStore.save();
      res.json({ success: true, data: { message: 'Expense deleted.' } });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================================
// 6. TIMELINE, CHECKLIST & EVENT-DAY RUN SHEET
// ============================================================================

apiRouter.get('/events/:eventId/tasks', authenticate, verifyEventAccess('read'), (req: Request, res: Response) => {
  const tasks = dbStore.collections.tasks.filter((t) => t.eventId === req.authorizedEvent!._id);
  const nowMs = Date.now();
  const enriched = tasks.map((t) => ({
    ...t,
    isOverdue: t.status !== 'completed' && new Date(t.dueDate).getTime() < nowMs,
  }));
  res.json({ success: true, data: { tasks: enriched } });
});

apiRouter.post(
  '/events/:eventId/tasks',
  authenticate,
  verifyEventAccess('tasks:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateTaskSchema.parse(req.body);
      const event = req.authorizedEvent!;
      const now = new Date().toISOString();

      const task = {
        _id: newObjectId(),
        eventId: event._id,
        ownerId: event.ownerId,
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      dbStore.collections.tasks.push(task);
      dbStore.save();

      res.status(201).json({ success: true, data: { task } });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.patch(
  '/events/:eventId/tasks/:taskId',
  authenticate,
  verifyEventAccess('tasks:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = UpdateTaskSchema.parse(req.body);
      const event = req.authorizedEvent!;
      const task = dbStore.collections.tasks.find(
        (t) => t._id === req.params.taskId && t.eventId === event._id
      );
      if (!task) {
        throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found.');
      }

      Object.assign(task, input, { updatedAt: new Date().toISOString() });
      dbStore.save();
      res.json({ success: true, data: { task } });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.delete(
  '/events/:eventId/tasks/:taskId',
  authenticate,
  verifyEventAccess('tasks:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = req.authorizedEvent!;
      const idx = dbStore.collections.tasks.findIndex(
        (t) => t._id === req.params.taskId && t.eventId === event._id
      );
      if (idx === -1) {
        throw new AppError(404, 'TASK_NOT_FOUND', 'Task not found.');
      }
      dbStore.collections.tasks.splice(idx, 1);
      dbStore.save();
      res.json({ success: true, data: { message: 'Task removed.' } });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================================
// 7. VENDOR & QUOTATION COORDINATION
// ============================================================================

apiRouter.get('/events/:eventId/vendors', authenticate, verifyEventAccess('read'), (req: Request, res: Response) => {
  const vendors = dbStore.collections.eventVendors.filter((v) => v.eventId === req.authorizedEvent!._id);
  res.json({ success: true, data: { vendors } });
});

apiRouter.post(
  '/events/:eventId/vendors',
  authenticate,
  verifyEventAccess('vendors:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateEventVendorSchema.parse(req.body);
      const event = req.authorizedEvent!;
      const now = new Date().toISOString();

      const vendor = {
        _id: newObjectId(),
        eventId: event._id,
        ownerId: event.ownerId,
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      dbStore.collections.eventVendors.unshift(vendor);
      dbStore.save();

      res.status(201).json({ success: true, data: { vendor } });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.patch(
  '/events/:eventId/vendors/:vendorId',
  authenticate,
  verifyEventAccess('vendors:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = UpdateEventVendorSchema.parse(req.body);
      const event = req.authorizedEvent!;
      const vendor = dbStore.collections.eventVendors.find(
        (v) => v._id === req.params.vendorId && v.eventId === event._id
      );
      if (!vendor) {
        throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor record not found.');
      }

      const nextQuoted = input.quotedAmountPaise ?? vendor.quotedAmountPaise;
      const nextAdvance = input.advancePaidPaise ?? vendor.advancePaidPaise;
      if (nextAdvance > nextQuoted) {
        throw new AppError(400, 'INVALID_ADVANCE', 'Advance payment cannot exceed quoted amount.');
      }

      Object.assign(vendor, input, { updatedAt: new Date().toISOString() });
      dbStore.save();
      res.json({ success: true, data: { vendor } });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.delete(
  '/events/:eventId/vendors/:vendorId',
  authenticate,
  verifyEventAccess('vendors:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = req.authorizedEvent!;
      const idx = dbStore.collections.eventVendors.findIndex(
        (v) => v._id === req.params.vendorId && v.eventId === event._id
      );
      if (idx === -1) {
        throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor record not found.');
      }
      dbStore.collections.eventVendors.splice(idx, 1);
      dbStore.save();
      res.json({ success: true, data: { message: 'Vendor quotation removed.' } });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================================
// 8. GUEST MANAGEMENT & RSVP TRACKING
// ============================================================================

apiRouter.get('/events/:eventId/guests', authenticate, verifyEventAccess('read'), (req: Request, res: Response) => {
  const guests = dbStore.collections.guests.filter((g) => g.eventId === req.authorizedEvent!._id);
  res.json({ success: true, data: { guests } });
});

apiRouter.post(
  '/events/:eventId/guests',
  authenticate,
  verifyEventAccess('guests:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateGuestSchema.parse(req.body);
      const event = req.authorizedEvent!;
      const now = new Date().toISOString();

      const guest = {
        _id: newObjectId(),
        eventId: event._id,
        ownerId: event.ownerId,
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      dbStore.collections.guests.unshift(guest);
      dbStore.save();

      res.status(201).json({ success: true, data: { guest } });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.post(
  '/events/:eventId/guests/import',
  authenticate,
  verifyEventAccess('guests:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { guests } = BulkGuestImportSchema.parse(req.body);
      const event = req.authorizedEvent!;
      const now = new Date().toISOString();

      const created = dbStore.transaction((cols) => {
        return guests.map((g) => {
          const doc = {
            _id: newObjectId(),
            eventId: event._id,
            ownerId: event.ownerId,
            ...g,
            createdAt: now,
            updatedAt: now,
          };
          cols.guests.push(doc);
          return doc;
        });
      });

      res.status(201).json({
        success: true,
        data: { importedCount: created.length, guests: created },
      });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.patch(
  '/events/:eventId/guests/:guestId',
  authenticate,
  verifyEventAccess('guests:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = UpdateGuestSchema.parse(req.body);
      const event = req.authorizedEvent!;
      const guest = dbStore.collections.guests.find(
        (g) => g._id === req.params.guestId && g.eventId === event._id
      );
      if (!guest) {
        throw new AppError(404, 'GUEST_NOT_FOUND', 'Guest record not found.');
      }

      Object.assign(guest, input, { updatedAt: new Date().toISOString() });
      dbStore.save();
      res.json({ success: true, data: { guest } });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.delete(
  '/events/:eventId/guests/:guestId',
  authenticate,
  verifyEventAccess('guests:write'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const event = req.authorizedEvent!;
      const idx = dbStore.collections.guests.findIndex(
        (g) => g._id === req.params.guestId && g.eventId === event._id
      );
      if (idx === -1) {
        throw new AppError(404, 'GUEST_NOT_FOUND', 'Guest record not found.');
      }
      dbStore.collections.guests.splice(idx, 1);
      dbStore.save();
      res.json({ success: true, data: { message: 'Guest removed.' } });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================================
// 9. AUTHORIZED REPORTS & CSV EXPORT (WITH FORMULA-INJECTION DEFENSE)
// ============================================================================

apiRouter.get(
  '/events/:eventId/reports/export.csv',
  authenticate,
  verifyEventAccess('read'),
  (req: Request, res: Response) => {
    const event = req.authorizedEvent!;
    const section = String(req.query.section || 'budget');

    const lines: string[] = [];

    if (section === 'guests') {
      lines.push(
        ['Full Name', 'Group', 'RSVP Status', 'Headcount', 'Dietary Preference', 'Seating Note', 'Phone', 'Email']
          .map(sanitizeCsvCell)
          .join(',')
      );
      const guests = dbStore.collections.guests.filter((g) => g.eventId === event._id);
      for (const g of guests) {
        lines.push(
          [
            g.fullName,
            g.groupName,
            g.rsvpStatus,
            g.headcount,
            g.dietaryPreference,
            g.tableOrSeatingNote,
            g.phone,
            g.email,
          ]
            .map(sanitizeCsvCell)
            .join(',')
        );
      }
    } else if (section === 'vendors') {
      lines.push(
        [
          'Vendor Name',
          'Service Category',
          'Status',
          'Verified Quotation',
          'Quoted Amount (INR)',
          'Advance Paid (INR)',
          'Balance Due (INR)',
          'Contact Person',
          'Phone',
        ]
          .map(sanitizeCsvCell)
          .join(',')
      );
      const vendors = dbStore.collections.eventVendors.filter((v) => v.eventId === event._id);
      for (const v of vendors) {
        lines.push(
          [
            v.vendorName,
            v.serviceCategory,
            v.status,
            v.isVerifiedQuotation ? 'Verified Vendor Quote' : 'Estimated Quote',
            (v.quotedAmountPaise / 100).toFixed(2),
            (v.advancePaidPaise / 100).toFixed(2),
            (Math.max(0, v.quotedAmountPaise - v.advancePaidPaise) / 100).toFixed(2),
            v.contactPerson,
            v.phone,
          ]
            .map(sanitizeCsvCell)
            .join(',')
        );
      }
    } else {
      // Default: Comprehensive Budget & Expense Ledger CSV
      lines.push(
        [
          'Record Type',
          'Category',
          'Item / Title',
          'Vendor',
          'Price Basis',
          'Payment Status',
          'Planned / Total Amount (INR)',
          'Advance Paid (INR)',
          'Balance Payable (INR)',
          'Date / Notes',
        ]
          .map(sanitizeCsvCell)
          .join(',')
      );

      const categories = dbStore.collections.budgetCategories.filter((c) => c.eventId === event._id);
      for (const c of categories) {
        lines.push(
          [
            'Budget Category Allocation',
            c.name,
            c.name,
            '-',
            c.isAiEstimated ? 'AI Estimate' : 'Owner Planned',
            '-',
            (c.plannedAmountPaise / 100).toFixed(2),
            '0.00',
            '0.00',
            c.notes,
          ]
            .map(sanitizeCsvCell)
            .join(',')
        );
      }

      const expenses = dbStore.collections.expenses.filter((x) => x.eventId === event._id);
      for (const x of expenses) {
        lines.push(
          [
            'Expense Entry',
            x.categoryName,
            x.title,
            x.vendorName || '-',
            x.priceType,
            x.paymentStatus,
            (x.amountPaise / 100).toFixed(2),
            (x.advancePaidPaise / 100).toFixed(2),
            (Math.max(0, x.amountPaise - x.advancePaidPaise) / 100).toFixed(2),
            x.notes || x.expenseDate,
          ]
            .map(sanitizeCsvCell)
            .join(',')
        );
      }
    }

    const rawSection = String(req.query.section || 'budget');
    const safeSection = ['budget', 'guests', 'vendors'].includes(rawSection) ? rawSection : 'budget';
    const safeEventId = String(event._id).replace(/[^a-zA-Z0-9_-]/g, '');

    dbStore.logAudit({
      actorUserId: req.user!._id,
      actorRole: req.user!.role,
      action: 'EVENT_REPORT_EXPORTED',
      targetType: 'Event',
      targetId: event._id,
      ipAddress: req.ip || '127.0.0.1',
      requestId: req.requestId || '',
      metadata: { section: safeSection },
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="aarambh-${safeEventId}-${safeSection}-report.csv"`
    );
    res.send(lines.join('\n'));
  }
);

// ============================================================================
// 10. PROTECTED ADMINISTRATION MODULE (SERVER-ENFORCED RBAC)
// ============================================================================

apiRouter.get('/admin/overview', authenticate, requireRole('admin'), (_req: Request, res: Response) => {
  const cols = dbStore.collections;

  // Never expose password hashes, verification/reset tokens, or private guest contact lists to admin screen
  const sanitizedUsers = cols.users.map((u) => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    emailVerified: u.emailVerified,
    status: u.status,
    city: u.city,
    aiDailyCount: u.aiDailyCount,
    createdAt: u.createdAt,
  }));

  const totalAiRuns = cols.aiGenerations.length;
  const failedAiRuns = cols.aiGenerations.filter((a) => a.status === 'failed');
  const totalInputTokens = cols.aiGenerations.reduce((acc, a) => acc + (a.estimatedInputTokens || 0), 0);
  const totalOutputTokens = cols.aiGenerations.reduce((acc, a) => acc + (a.estimatedOutputTokens || 0), 0);
  const rateLimitEvents = cols.auditLogs.filter((l) => l.action.startsWith('RATE_LIMIT_TRIGGERED'));

  const eventsByType: Record<string, number> = {};
  for (const ev of cols.events) {
    eventsByType[ev.eventType] = (eventsByType[ev.eventType] || 0) + 1;
  }

  res.json({
    success: true,
    data: {
      metrics: {
        totalUsers: cols.users.length,
        activeUsers: cols.users.filter((u) => u.status === 'active').length,
        totalEvents: cols.events.length,
        totalAiGenerations: totalAiRuns,
        failedAiGenerations: failedAiRuns.length,
        totalEstimatedTokens: totalInputTokens + totalOutputTokens,
        rateLimitEventsCount: rateLimitEvents.length,
        openAbuseReportsCount: cols.abuseReports.filter((r) => r.status === 'open').length,
        eventsByType,
      },
      users: sanitizedUsers,
      aiGenerations: cols.aiGenerations.slice(0, 40).map((a) => ({
        _id: a._id,
        eventId: a.eventId,
        modelName: a.modelName,
        generationType: a.generationType,
        status: a.status,
        estimatedInputTokens: a.estimatedInputTokens,
        estimatedOutputTokens: a.estimatedOutputTokens,
        latencyMs: a.latencyMs,
        errorMessage: a.errorMessage,
        createdAt: a.createdAt,
      })),
      abuseReports: cols.abuseReports,
      platformConfig: cols.platformConfig,
      auditLogs: cols.auditLogs.slice(0, 60),
    },
  });
});

apiRouter.patch(
  '/admin/users/:userId',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = AdminUpdateUserSchema.parse(req.body);
      const targetUser = dbStore.collections.users.find((u) => u._id === req.params.userId);
      if (!targetUser) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
      }

      // Prevent admin self-suspension or self-demotion
      if (targetUser._id === req.user!._id && (input.status === 'suspended' || input.role === 'customer')) {
        throw new AppError(
          400,
          'ADMIN_SELF_LOCKOUT_PREVENTED',
          'Administrators cannot suspend or demote their own active account.'
        );
      }

      if (input.status) {
        targetUser.status = input.status;
        if (input.status === 'suspended') {
          targetUser.sessionVersion += 1; // Revoke active sessions immediately
        }
      }
      if (input.role) {
        targetUser.role = input.role;
        targetUser.sessionVersion += 1;
      }
      targetUser.updatedAt = new Date().toISOString();
      dbStore.logAudit({
        actorUserId: req.user!._id,
        actorRole: req.user!.role,
        action: 'ADMIN_USER_MODIFIED',
        targetType: 'User',
        targetId: targetUser._id,
        ipAddress: req.ip || '127.0.0.1',
        requestId: req.requestId || '',
        metadata: { status: targetUser.status, role: targetUser.role },
      });

      res.json({ success: true, data: { user: serializeUser(targetUser) } });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.patch(
  '/admin/config',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = AdminUpdateConfigSchema.parse(req.body);
      const cfg = dbStore.collections.platformConfig;

      if (input.aiDailyQuotaPerUser !== undefined) {
        cfg.aiDailyQuotaPerUser = input.aiDailyQuotaPerUser;
      }
      if (input.allowNewRegistrations !== undefined) {
        cfg.allowNewRegistrations = input.allowNewRegistrations;
      }
      if (input.enableCollaboratorModule !== undefined) {
        cfg.enableCollaboratorModule = input.enableCollaboratorModule;
      }
      cfg.updatedAt = new Date().toISOString();

      dbStore.logAudit({
        actorUserId: req.user!._id,
        actorRole: req.user!.role,
        action: 'ADMIN_PLATFORM_CONFIG_UPDATED',
        targetType: 'PlatformConfig',
        targetId: cfg._id,
        ipAddress: req.ip || '127.0.0.1',
        requestId: req.requestId || '',
        metadata: {
          aiDailyQuotaPerUser: cfg.aiDailyQuotaPerUser,
          allowNewRegistrations: cfg.allowNewRegistrations,
        },
      });

      res.json({ success: true, data: { platformConfig: cfg } });
    } catch (err) {
      next(err);
    }
  }
);

apiRouter.patch(
  '/admin/abuse-reports/:reportId',
  authenticate,
  requireRole('admin'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = AdminUpdateAbuseReportSchema.parse(req.body);
      const report = dbStore.collections.abuseReports.find((r) => r._id === req.params.reportId);
      if (!report) {
        throw new AppError(404, 'REPORT_NOT_FOUND', 'Abuse report not found.');
      }
      if (input.status) {
        report.status = input.status;
      }
      if (input.resolutionNotes !== undefined) {
        report.resolutionNotes = input.resolutionNotes;
      }
      report.updatedAt = new Date().toISOString();

      dbStore.logAudit({
        actorUserId: req.user!._id,
        actorRole: req.user!.role,
        action: 'ADMIN_ABUSE_REPORT_UPDATED',
        targetType: 'AbuseReport',
        targetId: report._id,
        ipAddress: req.ip || '127.0.0.1',
        requestId: req.requestId || '',
        metadata: { status: report.status },
      });

      res.json({ success: true, data: { report } });
    } catch (err) {
      next(err);
    }
  }
);
