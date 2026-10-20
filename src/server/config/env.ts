import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((val) => {
    if (typeof val === 'string' && val.trim() === '') {
      return undefined;
    }
    return val;
  }, schema);

const envSchema = z.object({
  NODE_ENV: emptyToUndefined(
    z.enum(['development', 'test', 'production']).catch('development')
  ).default('development'),
  PORT: emptyToUndefined(
    z.coerce.number().int().positive().catch(3000)
  ).default(3000),
  MONGODB_URI: emptyToUndefined(z.string().optional()).default(''),
  FRONTEND_ORIGIN: emptyToUndefined(z.string()).default('http://localhost:3000'),
  APP_URL: emptyToUndefined(z.string().optional()).default('http://localhost:3000'),
  SESSION_SECRET: emptyToUndefined(
    z
      .string()
      .min(16)
      .catch('dev-only-ephemeral-session-secret-do-not-use-in-prod-987654321')
  ).default('dev-only-ephemeral-session-secret-do-not-use-in-prod-987654321'),
  CSRF_SECRET: emptyToUndefined(
    z
      .string()
      .min(16)
      .catch('dev-only-ephemeral-csrf-secret-do-not-use-in-prod-123456789')
  ).default('dev-only-ephemeral-csrf-secret-do-not-use-in-prod-123456789'),
  GEMINI_API_KEY: emptyToUndefined(z.string().optional()).default(''),
  LLM_API_KEY: emptyToUndefined(z.string().optional()).default(''),
  LLM_MODEL: emptyToUndefined(z.string()).default('gemini-3.8-flash'),
  AI_DAILY_QUOTA_PER_USER: emptyToUndefined(
    z.coerce.number().int().positive().catch(25)
  ).default(25),
  AI_REQUEST_TIMEOUT_MS: emptyToUndefined(
    z.coerce.number().int().positive().catch(45000)
  ).default(45000),
  EMAIL_PROVIDER: emptyToUndefined(
    z.enum(['console', 'smtp']).catch('console')
  ).default('console'),
  EMAIL_FROM: emptyToUndefined(z.string()).default('no-reply@aarambh-events.in'),
  LOG_LEVEL: emptyToUndefined(
    z.enum(['debug', 'info', 'warn', 'error']).catch('info')
  ).default('info'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  const data = parsed.success
    ? parsed.data
    : {
        NODE_ENV: 'development' as const,
        PORT: 3000,
        MONGODB_URI: '',
        FRONTEND_ORIGIN: 'http://localhost:3000',
        APP_URL: 'http://localhost:3000',
        SESSION_SECRET: 'dev-only-ephemeral-session-secret-do-not-use-in-prod-987654321',
        CSRF_SECRET: 'dev-only-ephemeral-csrf-secret-do-not-use-in-prod-123456789',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
        LLM_API_KEY: process.env.LLM_API_KEY || '',
        LLM_MODEL: 'gemini-3.8-flash',
        AI_DAILY_QUOTA_PER_USER: 25,
        AI_REQUEST_TIMEOUT_MS: 45000,
        EMAIL_PROVIDER: 'console' as const,
        EMAIL_FROM: 'no-reply@aarambh-events.in',
        LOG_LEVEL: 'info' as const,
      };

  return {
    ...data,
    EFFECTIVE_GEMINI_KEY: data.GEMINI_API_KEY || data.LLM_API_KEY || '',
  };
}

export const env = loadEnv();
