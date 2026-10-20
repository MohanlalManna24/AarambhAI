import { env } from '../config/env.js';

const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'sessiontoken',
  'csrftoken',
  'verificationtoken',
  'resettoken',
  'secret',
  'session_secret',
  'csrf_secret',
  'apikey',
  'gemini_api_key',
  'llm_api_key',
  'authorization',
  'cookie',
]);

export function redactSensitiveData(input: unknown): unknown {
  if (input === null || input === undefined) return input;
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitiveData(item));
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (REDACTED_KEYS.has(key.toLowerCase())) {
      output[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      output[key] = redactSensitiveData(value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(level: LogLevel): boolean {
  const configured = env.LOG_LEVEL || 'info';
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[configured];
}

export const logger = {
  debug(message: string, meta?: Record<string, unknown>) {
    if (!shouldLog('debug')) return;
    console.debug(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'debug',
        message,
        ...(meta ? { meta: redactSensitiveData(meta) } : {}),
      })
    );
  },
  info(message: string, meta?: Record<string, unknown>) {
    if (!shouldLog('info')) return;
    console.info(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'info',
        message,
        ...(meta ? { meta: redactSensitiveData(meta) } : {}),
      })
    );
  },
  warn(message: string, meta?: Record<string, unknown>) {
    if (!shouldLog('warn')) return;
    console.warn(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'warn',
        message,
        ...(meta ? { meta: redactSensitiveData(meta) } : {}),
      })
    );
  },
  error(message: string, meta?: Record<string, unknown>) {
    if (!shouldLog('error')) return;
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message,
        ...(meta ? { meta: redactSensitiveData(meta) } : {}),
      })
    );
  },
};
