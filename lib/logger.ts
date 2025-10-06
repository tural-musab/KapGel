/**
 * Structured Logger for KapGel Platform
 * 
 * Provides centralized logging with:
 * - Structured JSON format
 * - Log levels (error, warn, info, debug)
 * - Context enrichment (userId, requestId, etc.)
 * - Production-ready configuration
 * 
 * Based on plan.md: Hafta 3, Gün 11-12
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogContext {
  userId?: string
  requestId?: string
  orderId?: string
  vendorId?: string
  courierId?: string
  [key: string]: string | number | boolean | undefined
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: LogContext
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

class Logger {
  private service: string
  private environment: string

  constructor(service: string = 'kapgel-api') {
    this.service = service
    this.environment = process.env.NODE_ENV || 'development'
  }

  private formatLog(level: LogLevel, message: string, context?: LogContext, error?: Error): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: {
        service: this.service,
        environment: this.environment,
        ...context,
      },
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: 'code' in error && typeof error.code === 'string' ? error.code : undefined,
      }
    }

    return entry
  }

  private write(entry: LogEntry): void {
    const logString = JSON.stringify(entry)

    // Development: Pretty print to console
    if (this.environment === 'development') {
      const emoji = {
        error: '❌',
        warn: '⚠️',
        info: 'ℹ️',
        debug: '🔍',
      }[entry.level]

      console.log(`${emoji} [${entry.level.toUpperCase()}] ${entry.message}`)
      if (entry.context && Object.keys(entry.context).length > 2) {
        console.log('  Context:', entry.context)
      }
      if (entry.error) {
        console.error('  Error:', entry.error.message)
        if (entry.error.stack) {
          console.error(entry.error.stack)
        }
      }
    } else {
      // Production: JSON to stdout (captured by logging service)
      console.log(logString)
    }

    // TODO: Send to Supabase logs table in production
    // this.sendToSupabase(entry)
  }

  error(message: string, context?: LogContext, error?: Error): void {
    this.write(this.formatLog('error', message, context, error))
  }

  warn(message: string, context?: LogContext): void {
    this.write(this.formatLog('warn', message, context))
  }

  info(message: string, context?: LogContext): void {
    this.write(this.formatLog('info', message, context))
  }

  debug(message: string, context?: LogContext): void {
    // Skip debug logs in production
    if (this.environment === 'production') return
    this.write(this.formatLog('debug', message, context))
  }

  // Convenience methods for common operations
  logOrderCreated(orderId: string, customerId: string, total: number): void {
    this.info('Order created', {
      orderId,
      customerId,
      total,
      action: 'order.created',
    })
  }

  logOrderTransition(orderId: string, oldStatus: string, newStatus: string, userId: string): void {
    this.info('Order status changed', {
      orderId,
      oldStatus,
      newStatus,
      userId,
      action: 'order.status_changed',
    })
  }

  logCourierLocationUpdate(courierId: string, orderId: string, lat: number, lng: number): void {
    this.debug('Courier location updated', {
      courierId,
      orderId,
      lat,
      lng,
      action: 'courier.location_updated',
    })
  }

  logAuthFailure(email: string, reason: string): void {
    this.warn('Authentication failed', {
      email,
      reason,
      action: 'auth.failed',
    })
  }

  logPaymentProcessed(orderId: string, amount: number, method: string): void {
    this.info('Payment processed', {
      orderId,
      amount,
      method,
      action: 'payment.processed',
    })
  }
}

// Singleton instance
const logger = new Logger()

export default logger

// Export types for use in other modules
export type { LogLevel, LogContext, LogEntry }
export { Logger }
