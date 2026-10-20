import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { dbStore, UserDoc, EventDoc } from '../db/store.js';
import { logger } from '../utils/logger.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: UserDoc;
      authorizedEvent?: EventDoc;
      eventRole?: 'owner' | 'editor' | 'viewer' | 'admin';
    }
  }
}

export const SESSION_COOKIE_NAME = 'aarambh_session';
export const CSRF_COOKIE_NAME = 'aarambh_csrf';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours short-lived session

interface SessionPayload {
  sub: string;
  role: string;
  ver: number;
  iat: number;
  exp: number;
}

export function signSessionToken(user: UserDoc): string {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: user._id,
    role: user.role,
    ver: user.sessionVersion,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', env.SESSION_SECRET)
      .update(encoded)
      .digest('base64url');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as SessionPayload;
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function generateCsrfToken(sessionToken: string): string {
  return crypto
    .createHmac('sha256', env.CSRF_SECRET)
    .update(sessionToken)
    .digest('base64url');
}

export function setAuthCookies(res: Response, user: UserDoc): { csrfToken: string; sessionToken: string } {
  const sessionToken = signSessionToken(user);
  const csrfToken = generateCsrfToken(sessionToken);
  const isProd = env.NODE_ENV === 'production';

  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });

  res.cookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
  });

  return { csrfToken, sessionToken };
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.length < 64 ? incoming : crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}

/**
 * Strips MongoDB operator injection keys ($gt, $ne, $where, etc.), prototype pollution keys,
 * and dangerous inline script/protocol vectors recursively from request payloads.
 */
export function stripUnsafeKeys(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return obj
      .replace(/<\s*\/?\s*script\b[^>]*>/gi, '')
      .replace(/javascript\s*:/gi, '')
      .replace(/\0/g, '');
  }
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUnsafeKeys(item));
  }
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (
      key.startsWith('$') ||
      key.includes('.') ||
      key === '__proto__' ||
      key === 'constructor' ||
      key === 'prototype'
    ) {
      continue;
    }
    clean[key] = stripUnsafeKeys(value);
  }
  return clean;
}

export function sanitizeNoSqlMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = stripUnsafeKeys(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    const cleanedQuery = stripUnsafeKeys(req.query) as Record<string, any>;
    for (const k of Object.keys(req.query)) {
      if (!(k in cleanedQuery)) {
        delete (req.query as Record<string, any>)[k];
      } else {
        (req.query as Record<string, any>)[k] = cleanedQuery[k];
      }
    }
  }
  if (req.params && typeof req.params === 'object') {
    const cleanedParams = stripUnsafeKeys(req.params) as Record<string, string>;
    for (const k of Object.keys(req.params)) {
      if (!(k in cleanedParams)) {
        delete req.params[k];
      } else {
        req.params[k] = cleanedParams[k];
      }
    }
  }
  next();
}

export function timingSafeTokenMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const cookieToken = req.cookies?.[SESSION_COOKIE_NAME];
  const headerAuth = req.headers.authorization;
  const bearerToken =
    typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')
      ? headerAuth.slice(7).trim()
      : null;

  const rawToken = cookieToken || bearerToken;
  if (!rawToken) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication is required to access this resource.'));
  }

  const payload = verifySessionToken(rawToken);
  if (!payload) {
    return next(new AppError(401, 'INVALID_SESSION', 'Your session has expired or is invalid. Please sign in again.'));
  }

  const user = dbStore.collections.users.find(
    (u) => u._id === payload.sub && u.status === 'active'
  );
  if (!user || user.sessionVersion !== payload.ver) {
    return next(new AppError(401, 'SESSION_REVOKED', 'Session is no longer active. Please sign in again.'));
  }

  // Enforce constant-time CSRF token validation when authenticated via browser cookie on state-mutating methods
  const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
  if (cookieToken && !bearerToken && unsafeMethods.has(req.method.toUpperCase())) {
    const csrfHeader = req.headers['x-csrf-token'];
    const expectedCsrf = generateCsrfToken(cookieToken);
    if (typeof csrfHeader !== 'string' || !timingSafeTokenMatch(csrfHeader, expectedCsrf)) {
      return next(
        new AppError(403, 'CSRF_VALIDATION_FAILED', 'Invalid or missing CSRF security token. Refresh and try again.')
      );
    }
  }

  req.user = user;
  next();
}

export function requireRole(...allowedRoles: ('customer' | 'admin' | 'vendor' | 'collaborator')[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required.'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      dbStore.logAudit({
        actorUserId: req.user._id,
        actorRole: req.user.role,
        action: 'UNAUTHORIZED_ROLE_ACCESS_BLOCKED',
        targetType: 'Endpoint',
        targetId: req.originalUrl,
        ipAddress: req.ip || '127.0.0.1',
        requestId: req.requestId || '',
        metadata: { requiredRoles: allowedRoles },
      });
      return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
    }
    next();
  };
}

/**
 * Enforces email verification before enabling sensitive account or export operations.
 */
export function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required.'));
  }
  if (!req.user.emailVerified) {
    return next(
      new AppError(
        403,
        'EMAIL_VERIFICATION_REQUIRED',
        'Please verify your email address before performing sensitive account or export operations.'
      )
    );
  }
  next();
}

export function verifyEventAccess(
  requiredPermission: 'read' | 'tasks:write' | 'guests:write' | 'budget:write' | 'vendors:write' | 'owner_only' = 'read'
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required.'));
    }
    const eventId = req.params.eventId || req.body?.eventId;
    if (!eventId || typeof eventId !== 'string') {
      return next(new AppError(400, 'INVALID_EVENT_ID', 'A valid event ID is required.'));
    }

    const event = dbStore.collections.events.find((e) => e._id === eventId);
    if (!event) {
      return next(new AppError(404, 'EVENT_NOT_FOUND', 'Event not found or you do not have access.'));
    }

    // Check direct ownership
    if (event.ownerId === req.user._id) {
      req.authorizedEvent = event;
      req.eventRole = 'owner';
      return next();
    }

    // Check explicit collaborator membership
    const membership = dbStore.collections.memberships.find(
      (m) => m.eventId === event._id && m.userId === req.user!._id && m.status === 'active'
    );

    if (membership) {
      if (requiredPermission === 'owner_only') {
        return next(new AppError(403, 'OWNER_REQUIRED', 'Only the event owner can perform this operation.'));
      }
      if (requiredPermission === 'read' || membership.permissions.includes(requiredPermission)) {
        req.authorizedEvent = event;
        req.eventRole = membership.role;
        return next();
      }
    }

    // Record cross-user access attempt in audit log
    dbStore.logAudit({
      actorUserId: req.user._id,
      actorRole: req.user.role,
      action: 'CROSS_USER_ACCESS_DENIED',
      targetType: 'Event',
      targetId: eventId,
      ipAddress: req.ip || '127.0.0.1',
      requestId: req.requestId || '',
      metadata: { requiredPermission },
    });

    // Return 404/403 without leaking existence details
    return next(new AppError(403, 'FORBIDDEN_EVENT_ACCESS', 'You are not authorized to access this event.'));
  };
}

function getClientRateLimitKey(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim().length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getClientRateLimitKey,
  handler: (req, res) => {
    dbStore.logAudit({
      actorUserId: req.user?._id || 'anonymous',
      actorRole: req.user?.role || 'anonymous',
      action: 'RATE_LIMIT_TRIGGERED_AUTH',
      targetType: 'AuthEndpoint',
      targetId: req.originalUrl,
      ipAddress: getClientRateLimitKey(req),
      requestId: req.requestId || '',
      metadata: {},
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many authentication requests. Please wait a few minutes before retrying.',
      },
    });
  },
});

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  keyGenerator: getClientRateLimitKey,
  handler: (req, res) => {
    dbStore.logAudit({
      actorUserId: req.user?._id || 'anonymous',
      actorRole: req.user?.role || 'anonymous',
      action: 'RATE_LIMIT_TRIGGERED_AI',
      targetType: 'AiEndpoint',
      targetId: req.originalUrl,
      ipAddress: getClientRateLimitKey(req),
      requestId: req.requestId || '',
      metadata: {},
    });
    res.status(429).json({
      success: false,
      error: {
        code: 'AI_RATE_LIMITED',
        message: 'AI generation rate limit reached. Please wait 60 seconds before making another request.',
      },
    });
  },
});

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      requestId: req.requestId,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      requestId: req.requestId,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'One or more fields failed validation.',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  logger.error('Unhandled API Error', {
    requestId: req.requestId,
    path: req.originalUrl,
    errorMessage: err instanceof Error ? err.message : 'Unknown error',
  });

  res.status(500).json({
    success: false,
    requestId: req.requestId,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected server error occurred. Your existing event data remains safe.',
    },
  });
}
