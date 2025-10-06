/**
 * Sentry Configuration - Client Side
 * 
 * Error tracking and performance monitoring for browser
 * Based on plan.md: Hafta 3, Gün 13-14
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV

// Only initialize Sentry in production
if (SENTRY_DSN && ENVIRONMENT === 'production') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    
    // Session Replay
    replaysSessionSampleRate: 0.01, // 1% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of errors
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive fields
      if (event.request) {
        delete event.request.cookies
        delete event.request.headers
      }
      
      // Remove user PII
      if (event.user) {
        delete event.user.email
        delete event.user.ip_address
      }
      
      return event
    },
    
    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random network errors
      'NetworkError',
      'Network request failed',
    ],
  })
}

export default Sentry
