/**
 * Structured logging com formato JSON
 * Integra com Sentry (error tracking) e CloudWatch/ELK (log aggregation)
 *
 * Uso:
 * logger.info("User logged in", { userId: "123", email: "user@example.com" })
 * logger.error("Database error", { code: "ECONNREFUSED", duration: 5000 })
 */

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogContext {
  requestId?: string;
  userId?: string | number;
  email?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  duration?: number;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class StructuredLogger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private minLogLevel = this.isDevelopment ? "debug" : "info";

  private levelOrder: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
  };

  /**
   * Log entry ao stdout (JSON)
   * Em produção, ser capturado por CloudWatch/ELK
   */
  private log(level: LogLevel, message: string, entry: LogEntry) {
    // Skip se log level é menor que o configurado
    if (this.levelOrder[level] < this.levelOrder[this.minLogLevel as LogLevel]) {
      return;
    }

    // Escrever ao stdout como JSON
    console.log(JSON.stringify(entry));

    // Em produção, enviar errors para Sentry
    if (level === "error" || level === "fatal") {
      this.reportToSentry(entry);
    }
  }

  /**
   * Integração com Sentry (opcional)
   * Requer: npm install @sentry/nextjs
   */
  private reportToSentry(entry: LogEntry) {
    // Implementar integração com Sentry aqui
    // import * as Sentry from "@sentry/nextjs";
    // Sentry.captureException(error, { tags: { level: entry.level } });
  }

  debug(message: string, context?: LogContext, duration?: number) {
    this.log("debug", message, {
      timestamp: new Date().toISOString(),
      level: "debug",
      message,
      context,
      duration,
    });
  }

  info(message: string, context?: LogContext, duration?: number) {
    this.log("info", message, {
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      context,
      duration,
    });
  }

  warn(message: string, context?: LogContext, duration?: number) {
    this.log("warn", message, {
      timestamp: new Date().toISOString(),
      level: "warn",
      message,
      context,
      duration,
    });
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
    duration?: number
  ) {
    const errorObj =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          }
        : {
            message: String(error),
          };

    this.log("error", message, {
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      context,
      error: errorObj,
      duration,
    });
  }

  fatal(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
    duration?: number
  ) {
    const errorObj =
      error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
          }
        : {
            message: String(error),
          };

    this.log("fatal", message, {
      timestamp: new Date().toISOString(),
      level: "fatal",
      message,
      context,
      error: errorObj,
      duration,
    });
  }

  /**
   * Helper para medir duração de operação
   */
  async timeAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.info(`${operation} completed`, { ...context, duration }, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`${operation} failed`, error, { ...context, duration }, duration);
      throw error;
    }
  }

  /**
   * Helper para medir duração de operação síncrona
   */
  timeSync<T>(
    operation: string,
    fn: () => T,
    context?: LogContext
  ): T {
    const startTime = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - startTime;
      this.info(`${operation} completed`, { ...context, duration }, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`${operation} failed`, error, { ...context, duration }, duration);
      throw error;
    }
  }

  /**
   * Criar contexto de request para rastrear através de logs
   */
  createRequestContext(
    requestId: string,
    userId?: string | number,
    email?: string,
    ip?: string
  ): LogContext {
    return { requestId, userId, email, ip };
  }
}

// Singleton
export const logger = new StructuredLogger();

/**
 * Middleware para adicionar request logging
 */
export function createRequestLogger(requestId: string) {
  return {
    info: (message: string, context?: LogContext) => {
      logger.info(message, { ...context, requestId });
    },
    warn: (message: string, context?: LogContext) => {
      logger.warn(message, { ...context, requestId });
    },
    error: (message: string, error?: Error | unknown, context?: LogContext) => {
      logger.error(message, error, { ...context, requestId });
    },
  };
}
