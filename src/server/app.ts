import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import {
  requestIdMiddleware,
  sanitizeNoSqlMiddleware,
  errorHandler,
} from './middleware/security.js';
import { apiRouter } from './routes/api.js';

export function createApp(): Express {
  const app = express();

  // Trust the first reverse proxy hop (e.g., Cloud Run / managed load balancer)
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Hardened Helmet security headers with CSP compatible with Vite & Google Fonts
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'self'", 'https://*.google.com', 'https://*.run.app'],
        },
      },
      crossOriginEmbedderPolicy: false,
      frameguard: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  // Explicit CORS allowlist with credentialed cookie support
  const allowedOrigins = new Set(
    [env.FRONTEND_ORIGIN, env.APP_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'].filter(Boolean)
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin) || origin.endsWith('.run.app')) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS policy'));
        }
      },
      credentials: true,
    })
  );

  app.use(requestIdMiddleware);
  app.use(cookieParser());
  // Enforce strict request payload size limits (100kb)
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Strip NoSQL injection operators ($gt, $ne, $where, prototype pollution)
  app.use(sanitizeNoSqlMiddleware);

  // Prevent proxy or browser caching of private API responses and enforce strict browser feature permissions
  app.use('/api', (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    next();
  });

  // Mount versioned API routes
  app.use('/api/v1', apiRouter);
  app.use('/api', apiRouter);

  // Unknown API route handler
  app.use('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      requestId: req.requestId,
      error: {
        code: 'ENDPOINT_NOT_FOUND',
        message: `API endpoint ${req.method} ${req.originalUrl} does not exist.`,
      },
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
