/**
 * Rate Limiting Middleware Utility
 * 
 * Implements rate limiting for API routes
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (request: Request) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  return function(request: Request): { allowed: boolean; retryAfter?: number } {
    const key = config.keyGenerator ? config.keyGenerator(request) : getDefaultKey(request);
    const now = Date.now();
    
    // Clean up expired entries
    if (rateLimitStore.size > 10000) {
      for (const [k, entry] of rateLimitStore.entries()) {
        if (entry.resetTime < now) {
          rateLimitStore.delete(k);
        }
      }
    }

    const entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      // New window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return { allowed: true };
    }

    if (entry.count >= config.maxRequests) {
      // Rate limit exceeded
      return { 
        allowed: false, 
        retryAfter: Math.ceil((entry.resetTime - now) / 1000) 
      };
    }

    // Increment counter
    entry.count++;
    return { allowed: true };
  };
}

function getDefaultKey(request: Request): string {
  // Try to get IP from headers
  const url = new URL(request.url);
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `${ip}:${url.pathname}`;
}

/**
 * Rate limit configurations for different API types
 */
export const rateLimitConfigs = {
  // Courier location updates: 100 requests per minute
  courierLocation: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Vendor dashboard: 200 requests per minute
  vendorApi: {
    maxRequests: 200,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // Order operations: 500 requests per minute
  orders: {
    maxRequests: 500,
    windowMs: 60 * 1000, // 1 minute
  },
  
  // General API: 1000 requests per hour
  general: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;