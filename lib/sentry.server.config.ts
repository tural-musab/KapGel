/**
 * Sentry Configuration - Server Side
 * 
 * Error tracking for Next.js server and API routes
 * Based on plan.md: Hafta 3, Gün 13-14
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN
const ENVIRONMENT = process.env.ENVIRONMENT || process.env.NODE_ENV

// Only initialize Sentry in production
if (SENTRY_DSN && ENVIRONMENT === 'production') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive request data
      if (event.request) {
        delete event.request.cookies
        
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers['Authorization']
          delete event.request.headers['authorization']
        }
      }
      
      return event
    },
  })
}

export default Sentry
