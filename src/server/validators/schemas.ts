import { z } from 'zod';
import { BudgetCategoryDoc, ExpenseDoc, EventDoc, EventVendorDoc } from '../db/store.js';

// ============================================================================
// 1. AUTHENTICATION & ACCOUNT SCHEMAS
// ============================================================================

export const RegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Enter a valid email address').max(160).transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must include at least one uppercase letter')
    .regex(/[a-z]/, 'Must include at least one lowercase letter')
    .regex(/[0-9]/, 'Must include at least one number'),
  city: z.string().trim().max(80).optional().default('Mumbai'),
  phone: z.string().trim().max(24).optional().default(''),
});

export const LoginSchema = z.object({
  email: z.string().trim().email().max(160).transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const VerifyEmailSchema = z.object({
  token: z.string().trim().min(6).max(256),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email().max(160).transform((v) => v.toLowerCase()),
});

export const ResetPasswordSchema = z.object({
  token: z.string().trim().min(6).max(256),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[0-9]/, 'Must include a number'),
});

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(24).optional(),
  city: z.string().trim().max(80).optional(),
  preferredCurrency: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
  privacySettings: z
    .object({
      shareAnalytics: z.boolean(),
      emailNotifications: z.boolean(),
      marketingOptIn: z.boolean(),
    })
    .optional(),
});

// ============================================================================
// 2. EVENT WIZARD & CRUD SCHEMAS
// ============================================================================

export const CreateEventSchema = z
  .object({
    title: z.string().trim().min(3, 'Event title must be at least 3 characters').max(140),
    eventType: z.enum(['wedding', 'birthday', 'anniversary', 'corporate', 'cultural', 'community']),
    startDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid start date'),
    endDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid end date'),
    timezone: z.string().trim().max(64).default('Asia/Kolkata'),
    city: z.string().trim().min(2, 'City is required').max(80),
    venueName: z.string().trim().max(140).optional().default(''),
    venueAddress: z.string().trim().max(260).optional().default(''),
    indoorOutdoor: z.enum(['indoor', 'outdoor', 'hybrid']).default('hybrid'),
    estimatedGuests: z.coerce.number().int().min(1, 'At least 1 guest required').max(50000),
    // Accept either totalBudgetPaise directly OR totalBudgetInr (converted to integer paise)
    totalBudgetPaise: z.coerce.number().int().min(100000, 'Minimum budget is ₹1,000 (100,000 paise)').max(100000000000),
    emergencyReservePaise: z.coerce.number().int().min(0).default(0),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP']).default('INR'),
    theme: z.string().trim().max(120).optional().default(''),
    preferredStyle: z.string().trim().max(120).optional().default('Contemporary Royal'),
    dietaryRequirements: z.array(z.string().trim().max(60)).max(20).optional().default(['Standard Vegetarian']),
    accessibilityRequirements: z.array(z.string().trim().max(80)).max(20).optional().default([]),
    culturalPreferences: z.string().trim().max(500).optional().default(''),
    specialInstructions: z.string().trim().max(1200).optional().default(''),
    planningStatus: z
      .enum(['draft', 'planning', 'confirmed', 'in_progress', 'completed', 'cancelled'])
      .optional()
      .default('planning'),
  })
  .refine((data) => new Date(data.endDate).getTime() >= new Date(data.startDate).getTime(), {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  })
  .refine((data) => data.emergencyReservePaise <= data.totalBudgetPaise, {
    message: 'Emergency reserve cannot exceed total event budget',
    path: ['emergencyReservePaise'],
  });

export const UpdateEventSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  eventType: z.enum(['wedding', 'birthday', 'anniversary', 'corporate', 'cultural', 'community']).optional(),
  startDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid start date').optional(),
  endDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid end date').optional(),
  city: z.string().trim().min(2).max(80).optional(),
  venueName: z.string().trim().max(140).optional(),
  venueAddress: z.string().trim().max(260).optional(),
  indoorOutdoor: z.enum(['indoor', 'outdoor', 'hybrid']).optional(),
  estimatedGuests: z.coerce.number().int().min(1).max(50000).optional(),
  totalBudgetPaise: z.coerce.number().int().min(100000).max(100000000000).optional(),
  emergencyReservePaise: z.coerce.number().int().min(0).optional(),
  theme: z.string().trim().max(120).optional(),
  preferredStyle: z.string().trim().max(120).optional(),
  dietaryRequirements: z.array(z.string().trim().max(60)).max(20).optional(),
  accessibilityRequirements: z.array(z.string().trim().max(80)).max(20).optional(),
  culturalPreferences: z.string().trim().max(500).optional(),
  specialInstructions: z.string().trim().max(1200).optional(),
  planningStatus: z.enum(['draft', 'planning', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
});

// ============================================================================
// 3. AI EVENT PLANNER & PERSONALIZED IDEAS SCHEMAS
// ============================================================================

export const GenerateAiPlanRequestSchema = z.object({
  customPromptFocus: z.string().trim().max(600).optional().default(''),
  prioritizeSustainability: z.boolean().optional().default(true),
  prioritizeCostSavings: z.boolean().optional().default(false),
});

export const AiGeneratedPlanSchema = z.object({
  overview: z.string().min(10).max(2000),
  themeAndDecor: z
    .array(
      z.object({
        area: z.string().min(1).max(160),
        concept: z.string().min(1).max(400),
        sustainabilityNote: z.string().max(300).default(''),
        estimatedCostInr: z.number().nonnegative(),
      })
    )
    .min(1),
  budgetAllocation: z
    .array(
      z.object({
        category: z.string().min(1).max(120),
        percentage: z.number().min(0).max(100),
        amountInr: z.number().nonnegative(),
        rationale: z.string().max(400),
      })
    )
    .min(1),
  preparationTimeline: z
    .array(
      z.object({
        timeframe: z.string().min(1).max(100),
        milestone: z.string().min(1).max(300),
        priority: z.enum(['low', 'medium', 'high', 'critical']),
      })
    )
    .min(1),
  vendorRequirements: z
    .array(
      z.object({
        category: z.string().min(1).max(120),
        specification: z.string().min(1).max(400),
        estimatedBudgetInr: z.number().nonnegative(),
      })
    )
    .min(1),
  taskChecklist: z
    .array(
      z.object({
        title: z.string().min(1).max(160),
        category: z.string().min(1).max(60),
        priority: z.enum(['low', 'medium', 'high', 'critical']),
        daysBeforeEvent: z.number().int().min(0).max(365),
      })
    )
    .min(1),
  menuAndEntertainment: z.object({
    menuHighlights: z.array(z.string().min(1).max(300)).min(1),
    entertainmentIdeas: z.array(z.string().min(1).max(300)).min(1),
  }),
  shoppingList: z.array(
    z.object({
      item: z.string().min(1).max(160),
      quantity: z.string().min(1).max(80),
      estimatedCostInr: z.number().nonnegative(),
    })
  ),
  eventDaySchedule: z
    .array(
      z.object({
        timeSlot: z.string().min(1).max(80),
        activity: z.string().min(1).max(260),
        owner: z.string().min(1).max(100),
      })
    )
    .min(1),
  riskAndContingency: z
    .array(
      z.object({
        risk: z.string().min(1).max(260),
        mitigation: z.string().min(1).max(360),
      })
    )
    .min(1),
  budgetSavingAlternatives: z
    .array(
      z.object({
        originalItem: z.string().min(1).max(200),
        alternative: z.string().min(1).max(260),
        estimatedSavingsInr: z.number().nonnegative(),
      })
    )
    .min(1),
  followUpQuestions: z.array(z.string().min(1).max(260)),
});

export type ValidatedAiPlan = z.infer<typeof AiGeneratedPlanSchema>;

export const PersonalizedIdeasRequestSchema = z.object({
  focusCategory: z.enum([
    'wedding_themes',
    'birthday_decorations',
    'cultural_community',
    'menu_options',
    'activities_entertainment',
    'low_budget_alternatives',
    'sustainable_decor',
    'bad_weather_indoor_backup',
    'shopping_list',
  ]),
  customContext: z.string().trim().max(500).optional().default(''),
});

export const PersonalizedIdeasResponseSchema = z.object({
  categoryTitle: z.string().min(2).max(160),
  curatedIdeas: z
    .array(
      z.object({
        title: z.string().min(2).max(160),
        explanation: z.string().min(5).max(500),
        estimatedCostRangeInr: z.string().min(2).max(120),
        lowBudgetOrSustainableAlternative: z.string().min(2).max(350),
      })
    )
    .min(1),
  shoppingChecklist: z.array(
    z.object({
      item: z.string().min(1).max(160),
      purpose: z.string().min(1).max(200),
      estimatedCostInr: z.number().nonnegative(),
    })
  ),
});

// ============================================================================
// 4. BUDGET & EXPENSE SCHEMAS (INTEGER PAISE ARITHMETIC)
// ============================================================================

export const CreateBudgetCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  plannedAmountPaise: z.coerce.number().int().min(0).max(100000000000),
  isAiEstimated: z.boolean().optional().default(false),
  notes: z.string().trim().max(400).optional().default(''),
});

export const CreateExpenseSchema = z
  .object({
    categoryId: z.string().trim().min(1),
    title: z.string().trim().min(2).max(140),
    vendorName: z.string().trim().max(140).optional().default(''),
    amountPaise: z.coerce.number().int().min(1, 'Expense amount must be greater than 0 paise').max(100000000000),
    advancePaidPaise: z.coerce.number().int().min(0).default(0),
    paymentStatus: z.enum(['planned', 'advance_paid', 'paid', 'refunded']).default('planned'),
    priceType: z.enum(['ai_estimate', 'vendor_quotation', 'confirmed_invoice']).default('vendor_quotation'),
    expenseDate: z.string().optional(),
    notes: z.string().trim().max(400).optional().default(''),
  })
  .refine((d) => d.advancePaidPaise <= d.amountPaise, {
    message: 'Advance paid cannot exceed total expense amount',
    path: ['advancePaidPaise'],
  });

/**
 * Authoritative backend financial calculation using integer minor units (paise).
 * Zero floating-point drift.
 */
export function computeEventBudgetSummary(
  event: EventDoc,
  categories: BudgetCategoryDoc[],
  expenses: ExpenseDoc[],
  vendors: EventVendorDoc[]
) {
  const totalBudgetPaise = Math.trunc(event.totalBudgetPaise);
  const emergencyReservePaise = Math.trunc(event.emergencyReservePaise);
  const allocatableBudgetPaise = Math.max(0, totalBudgetPaise - emergencyReservePaise);

  const totalPlannedCategoriesPaise = categories.reduce(
    (acc, cat) => acc + Math.trunc(cat.plannedAmountPaise),
    0
  );

  const activeExpenses = expenses.filter((e) => e.paymentStatus !== 'refunded');

  const totalActualExpensesPaise = activeExpenses.reduce(
    (acc, exp) => acc + Math.trunc(exp.amountPaise),
    0
  );

  const totalAdvancePaidPaise = activeExpenses.reduce(
    (acc, exp) => acc + Math.trunc(exp.advancePaidPaise),
    0
  );

  const totalRemainingPayablePaise = Math.max(0, totalActualExpensesPaise - totalAdvancePaidPaise);
  const remainingUnspentBudgetPaise = totalBudgetPaise - totalActualExpensesPaise;
  const remainingAllocatablePaise = allocatableBudgetPaise - totalActualExpensesPaise;

  const confirmedInvoiceTotalPaise = activeExpenses
    .filter((e) => e.priceType === 'confirmed_invoice')
    .reduce((acc, e) => acc + Math.trunc(e.amountPaise), 0);

  const verifiedVendorQuotationTotalPaise = activeExpenses
    .filter((e) => e.priceType === 'vendor_quotation')
    .reduce((acc, e) => acc + Math.trunc(e.amountPaise), 0);

  const aiEstimatedExpenseTotalPaise = activeExpenses
    .filter((e) => e.priceType === 'ai_estimate')
    .reduce((acc, e) => acc + Math.trunc(e.amountPaise), 0);

  const bookedVendorsQuotationPaise = vendors
    .filter((v) => v.status === 'booked' || v.status === 'completed')
    .reduce((acc, v) => acc + Math.trunc(v.quotedAmountPaise), 0);

  const categoryBreakdown = categories.map((cat) => {
    const catExpenses = activeExpenses.filter((e) => e.categoryId === cat._id);
    const actualPaise = catExpenses.reduce((sum, e) => sum + Math.trunc(e.amountPaise), 0);
    const advancePaise = catExpenses.reduce((sum, e) => sum + Math.trunc(e.advancePaidPaise), 0);
    const plannedPaise = Math.trunc(cat.plannedAmountPaise);
    const variancePaise = plannedPaise - actualPaise;
    const isOverBudget = actualPaise > plannedPaise && plannedPaise > 0;
    const utilizationBps = plannedPaise > 0 ? Math.round((actualPaise * 10000) / plannedPaise) : 0;

    return {
      categoryId: cat._id,
      name: cat.name,
      isAiEstimated: cat.isAiEstimated,
      plannedAmountPaise: plannedPaise,
      actualAmountPaise: actualPaise,
      advancePaidPaise: advancePaise,
      balancePayablePaise: Math.max(0, actualPaise - advancePaise),
      variancePaise,
      isOverBudget,
      utilizationPercent: Number((utilizationBps / 100).toFixed(1)),
      notes: cat.notes,
    };
  });

  const overBudgetCategories = categoryBreakdown.filter((c) => c.isOverBudget);
  const isTotalOverAllocatable = totalActualExpensesPaise > allocatableBudgetPaise;
  const isTotalOverGrossBudget = totalActualExpensesPaise > totalBudgetPaise;

  const utilizationBps =
    totalBudgetPaise > 0 ? Math.round((totalActualExpensesPaise * 10000) / totalBudgetPaise) : 0;

  return {
    currency: event.currency,
    totalBudgetPaise,
    emergencyReservePaise,
    allocatableBudgetPaise,
    totalPlannedCategoriesPaise,
    totalActualExpensesPaise,
    totalAdvancePaidPaise,
    totalRemainingPayablePaise,
    remainingUnspentBudgetPaise,
    remainingAllocatablePaise,
    confirmedInvoiceTotalPaise,
    verifiedVendorQuotationTotalPaise,
    aiEstimatedExpenseTotalPaise,
    bookedVendorsQuotationPaise,
    utilizationPercent: Number((utilizationBps / 100).toFixed(1)),
    isTotalOverAllocatable,
    isTotalOverGrossBudget,
    overBudgetCategoriesCount: overBudgetCategories.length,
    overBudgetAlerts: overBudgetCategories.map(
      (c) =>
        `${c.name} exceeds planned allocation by ₹${Math.round(Math.abs(c.variancePaise) / 100).toLocaleString('en-IN')}`
    ),
    categoryBreakdown,
  };
}

// ============================================================================
// 5. TASKS, VENDORS & GUESTS SCHEMAS
// ============================================================================

export const CreateTaskSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(600).optional().default(''),
  category: z
    .enum([
      'venue',
      'catering',
      'decor',
      'rituals',
      'logistics',
      'guests',
      'entertainment',
      'attire',
      'documentation',
      'run_sheet',
    ])
    .default('logistics'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'blocked', 'completed']).default('todo'),
  dueDate: z.string().refine((val) => !Number.isNaN(Date.parse(val)), 'Invalid due date'),
  isEventDayRunSheet: z.boolean().optional().default(false),
  runSheetTime: z.string().trim().max(40).optional().default(''),
  assignedToName: z.string().trim().max(80).optional().default('Event Owner'),
  dependsOnTaskIds: z.array(z.string()).max(10).optional().default([]),
  reminderEnabled: z.boolean().optional().default(false),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const CreateEventVendorSchema = z
  .object({
    vendorName: z.string().trim().min(2).max(140),
    serviceCategory: z.enum([
      'venue',
      'catering',
      'decor_florals',
      'photography_cinema',
      'music_entertainment',
      'makeup_mehendi',
      'logistics_transport',
      'invitations_gifting',
      'lighting_sound',
    ]),
    contactPerson: z.string().trim().max(100).optional().default(''),
    phone: z.string().trim().max(24).optional().default(''),
    email: z.string().trim().max(160).optional().default(''),
    city: z.string().trim().max(80).optional().default(''),
    quotedAmountPaise: z.coerce.number().int().min(0).max(100000000000),
    advancePaidPaise: z.coerce.number().int().min(0).default(0),
    isVerifiedQuotation: z.boolean().default(true),
    status: z.enum(['shortlisted', 'contacted', 'booked', 'completed', 'cancelled']).default('shortlisted'),
    followUpDate: z.string().nullable().optional().default(null),
    deliverablesNotes: z.string().trim().max(800).optional().default(''),
    documentReference: z.string().trim().max(180).optional().default(''),
  })
  .refine((v) => v.advancePaidPaise <= v.quotedAmountPaise, {
    message: 'Advance paid cannot exceed vendor quoted amount',
    path: ['advancePaidPaise'],
  });

export const UpdateEventVendorSchema = z.object({
  vendorName: z.string().trim().min(2).max(140).optional(),
  serviceCategory: z
    .enum([
      'venue',
      'catering',
      'decor_florals',
      'photography_cinema',
      'music_entertainment',
      'makeup_mehendi',
      'logistics_transport',
      'invitations_gifting',
      'lighting_sound',
    ])
    .optional(),
  contactPerson: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(24).optional(),
  email: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  quotedAmountPaise: z.coerce.number().int().min(0).max(100000000000).optional(),
  advancePaidPaise: z.coerce.number().int().min(0).optional(),
  isVerifiedQuotation: z.boolean().optional(),
  status: z.enum(['shortlisted', 'contacted', 'booked', 'completed', 'cancelled']).optional(),
  followUpDate: z.string().nullable().optional(),
  deliverablesNotes: z.string().trim().max(800).optional(),
  documentReference: z.string().trim().max(180).optional(),
});

export const CreateGuestSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().max(160).optional().default(''),
  phone: z.string().trim().max(24).optional().default(''),
  groupName: z
    .enum(['family_bride', 'family_groom', 'friends', 'vip_dignitaries', 'colleagues', 'community', 'general'])
    .default('general'),
  tags: z.array(z.string().trim().max(40)).max(10).optional().default([]),
  rsvpStatus: z.enum(['pending', 'confirmed', 'declined', 'tentative']).default('pending'),
  invitationStatus: z.enum(['not_sent', 'sent', 'viewed']).default('not_sent'),
  headcount: z.coerce.number().int().min(1).max(20).default(1),
  dietaryPreference: z
    .enum(['standard_veg', 'jain_no_onion_garlic', 'non_veg', 'vegan', 'gluten_free', 'halal', 'kids_meal'])
    .default('standard_veg'),
  tableOrSeatingNote: z.string().trim().max(160).optional().default(''),
  requiresAccessibilitySupport: z.boolean().optional().default(false),
});

export const UpdateGuestSchema = CreateGuestSchema.partial();

export const BulkGuestImportSchema = z.object({
  guests: z.array(CreateGuestSchema).min(1).max(500),
});

// ============================================================================
// 6. ADMIN GOVERNANCE & MODERATION SCHEMAS (STRICT)
// ============================================================================

export const AdminUpdateUserSchema = z
  .object({
    status: z.enum(['active', 'suspended']).optional(),
    role: z.enum(['customer', 'admin']).optional(),
  })
  .strict();

export const AdminUpdateConfigSchema = z
  .object({
    aiDailyQuotaPerUser: z.coerce.number().int().min(1).max(500).optional(),
    allowNewRegistrations: z.boolean().optional(),
    enableCollaboratorModule: z.boolean().optional(),
  })
  .strict();

export const AdminUpdateAbuseReportSchema = z
  .object({
    status: z.enum(['open', 'investigating', 'resolved', 'dismissed']).optional(),
    resolutionNotes: z.string().trim().max(500).optional(),
  })
  .strict();

/**
 * Prevents Spreadsheet / CSV Formula Injection (OWASP CSV Injection defense).
 * Prefixes cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` with a single quote
 * and escapes embedded double quotes.
 */
export function sanitizeCsvCell(value: unknown): string {
  const raw = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  const formulaNeutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  const escaped = formulaNeutralized.replace(/"/g, '""');
  return `"${escaped}"`;
}
