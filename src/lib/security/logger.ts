/**
 * Centralized Error Logging & Monitoring
 *
 * Sends error/fatal events to Sentry when NEXT_PUBLIC_SENTRY_DSN is set.
 * Otherwise structured console logging with context.
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  userId?: string;
  projectId?: string;
  requestId?: string;
  endpoint?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
  userAgent?: string;
  ip?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ---------------------------------------------------------------------------
// Sentry initialisation (lazy, one-time)
// ---------------------------------------------------------------------------

let _sentryInitialised = false;

function ensureSentry(): boolean {
  if (_sentryInitialised) return true;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return false;

  try {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      // Only send errors/fatals — keep volume low
      tracesSampleRate: 0,
    });
    _sentryInitialised = true;
    console.info('[logger] Sentry initialised');
    return true;
  } catch (err) {
    console.warn('[logger] Sentry init failed:', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

class Logger {
  private serviceName: string;
  private environment: string;

  constructor() {
    this.serviceName = 'truyencity-ai-writer';
    this.environment = process.env.NODE_ENV || 'development';
  }

  private formatLog(entry: LogEntry): string {
    if (this.environment === 'development') {
      return JSON.stringify(entry, null, 2);
    }
    return JSON.stringify(entry);
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        ...context,
        service: this.serviceName,
        environment: this.environment,
      },
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.environment === 'development' ? error.stack : undefined,
      };
    }

    const output = this.formatLog(entry);

    switch (level) {
      case 'debug':
        if (this.environment === 'development') console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        this.sendToSentry(level, message, context, error);
        break;
    }
  }

  /**
   * Send error/fatal events to Sentry (no-op when DSN is not set)
   */
  private sendToSentry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): void {
    if (!ensureSentry()) return;

    try {
      Sentry.withScope((scope) => {
        scope.setLevel(level === 'fatal' ? 'fatal' : 'error');

        if (context) {
          // Set structured context
          scope.setExtras(context as Record<string, unknown>);
          if (context.userId) scope.setUser({ id: context.userId });
          if (context.endpoint) scope.setTag('endpoint', context.endpoint);
          if (context.projectId) scope.setTag('projectId', context.projectId);
        }

        if (error) {
          Sentry.captureException(error);
        } else {
          Sentry.captureMessage(message, level === 'fatal' ? 'fatal' : 'error');
        }
      });
    } catch (err) {
      // Never let Sentry failure break the app
      console.warn('[logger] Sentry capture failed:', err);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log('error', message, context, error);
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log('fatal', message, context, error);
  }

  /**
   * Log API request with timing
   */
  apiRequest(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context?: Partial<LogContext>,
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    this.log(level, `${method} ${endpoint} ${statusCode}`, {
      ...context,
      method,
      endpoint,
      statusCode,
      duration,
    });
  }

  /**
   * Log AI writing operation
   */
  aiWritingOperation(
    operation: string,
    projectId: string,
    success: boolean,
    duration: number,
    details?: Record<string, unknown>,
  ): void {
    const level: LogLevel = success ? 'info' : 'error';

    this.log(level, `AI Writing: ${operation}`, {
      projectId,
      duration,
      success,
      ...details,
    });
  }

  /**
   * Log billing/subscription event
   */
  billingEvent(
    event: string,
    userId: string,
    details?: Record<string, unknown>,
  ): void {
    this.log('info', `Billing: ${event}`, {
      userId,
      ...details,
    });
  }

  /**
   * Log security event (rate limit, auth failure, etc.)
   */
  securityEvent(
    event: string,
    ip: string,
    details?: Record<string, unknown>,
  ): void {
    this.log('warn', `Security: ${event}`, {
      ip,
      ...details,
    });
  }
}

// Singleton instance
export const logger = new Logger();

/**
 * Request context helper - extracts common context from request
 */
export function getRequestContext(request: Request): Partial<LogContext> {
  const url = new URL(request.url);

  return {
    endpoint: url.pathname,
    method: request.method,
    userAgent: request.headers.get('user-agent') || undefined,
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      undefined,
  };
}

/**
 * Timing helper for measuring operation duration
 */
export function createTimer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
