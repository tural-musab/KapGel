# Production Hardening: KapGel MVP Infrastructure & Scaling

**Feature Branch**: `001-kapsam-roller-m`  
**Created**: 2025-10-07  
**Status**: Active  
**Owner**: DevOps & Engineering Team  
**Related Specs**: `spec.md`, `testing-strategy.md`, `plan.md`

---

## Overview

This document defines the infrastructure improvements and scaling strategies required for KapGel MVP production deployment. It covers migration from development-grade implementations to production-ready infrastructure, including Redis migration, monitoring setup, and deployment automation.

---

## Clarifications

### Session 2025-10-07

- Q: What is the target production scale? → A: Support 100 concurrent vendors, 500 concurrent customers, 50 active couriers during peak hours.
- Q: Should rate limiting be distributed across multiple app instances? → A: Yes, rate limiting MUST use shared Redis store to work correctly with horizontal scaling.
- Q: What monitoring is required for production? → A: Application Performance Monitoring (APM), error tracking, real-time dashboards, and automated alerting for critical failures.
- Q: How should database migrations be handled in production? → A: Zero-downtime migrations with rollback capability, applied during maintenance windows.
- Q: What is the disaster recovery requirement? → A: RTO ≤4 hours, RPO ≤15 minutes for critical data (orders, payments).

---

## Infrastructure Components *(mandatory)*

### 1. Rate Limiting Migration (Redis)

**Current State**: In-memory Map-based rate limiting (development only)
**Target State**: Distributed Redis-based rate limiting

**Migration Plan**:

#### Phase 1: Redis Integration
```typescript
// lib/rate-limit-redis.ts (NEW FILE)
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export function createRedisRateLimit(config: RateLimitConfig) {
  return async function(request: Request): Promise<{ allowed: boolean; retryAfter?: number }> {
    const key = config.keyGenerator ? config.keyGenerator(request) : getDefaultKey(request)
    const now = Date.now()
    const windowKey = `rate_limit:${key}:${Math.floor(now / config.windowMs)}`
    
    // Atomic increment with expiration
    const pipeline = redis.pipeline()
    pipeline.incr(windowKey)
    pipeline.expire(windowKey, Math.ceil(config.windowMs / 1000))
    
    const [count] = await pipeline.exec()
    
    if (count > config.maxRequests) {
      const ttl = await redis.ttl(windowKey)
      return { allowed: false, retryAfter: ttl > 0 ? ttl : 60 }
    }
    
    return { allowed: true }
  }
}
```

#### Phase 2: Graceful Fallback
```typescript
// lib/rate-limit.ts (UPDATED)
import { createRedisRateLimit } from './rate-limit-redis'
import { createMemoryRateLimit } from './rate-limit-memory' // Existing implementation

export function rateLimit(config: RateLimitConfig) {
  // Try Redis first, fallback to memory if Redis is unavailable
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      return createRedisRateLimit(config)
    } catch (error) {
      console.warn('Redis rate limiting failed, falling back to memory:', error)
    }
  }
  
  return createMemoryRateLimit(config) // Current implementation
}
```

#### Phase 3: Environment Configuration
```bash
# Production .env additions
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
RATE_LIMIT_BACKEND=redis  # redis | memory | disabled
```

**Rollout Strategy**:
1. Deploy Redis integration with feature flag (`RATE_LIMIT_BACKEND=memory`)
2. Enable Redis on staging environment for testing
3. Monitor Redis performance and error rates
4. Gradually enable Redis in production (`RATE_LIMIT_BACKEND=redis`)
5. Remove memory fallback after stable operation (1 week)

**Success Criteria**:
- Rate limiting works across multiple app instances
- Latency impact ≤10ms per request
- 99.9% Redis availability
- Zero rate limit state loss during deployments

---

### 2. Database Optimization

**Current State**: Default Supabase configuration
**Target State**: Production-optimized database with monitoring

#### Connection Pool Optimization
```typescript
// lib/supabase/server.ts (UPDATED)
export function createClient() {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      // Production pool settings
      realtime: {
        params: {
          eventsPerSecond: 100, // Limit to prevent abuse
        },
      },
    }
  )
}
```

#### Query Performance Monitoring
```sql
-- Database performance queries for monitoring
-- Query execution time monitoring
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats 
WHERE schemaname = 'public'
  AND n_distinct > 100;

-- Slow query identification  
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements 
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

#### Index Optimization
```sql
-- Additional production indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created_at 
  ON orders(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courier_locations_order_updated 
  ON courier_locations(order_id, updated_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_created 
  ON users(role, created_at DESC);

-- Partial indexes for active data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_active 
  ON orders(branch_id, status, created_at DESC) 
  WHERE status IN ('NEW', 'CONFIRMED', 'PREPARING', 'PICKED_UP', 'ON_ROUTE');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_couriers_online 
  ON couriers(vendor_id, shift_status, updated_at DESC) 
  WHERE shift_status = 'online';
```

---

### 3. Monitoring & Observability

**Components**: Application Performance Monitoring (APM), Error Tracking, Metrics, Logs

#### Sentry Configuration Enhancement
```typescript
// sentry.server.config.ts (ENHANCED)
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Production-specific settings
  beforeSend(event) {
    // Filter sensitive data
    if (event.exception) {
      event.exception.values?.forEach(exception => {
        if (exception.stacktrace) {
          exception.stacktrace.frames?.forEach(frame => {
            if (frame.vars) {
              delete frame.vars.password
              delete frame.vars.token
              delete frame.vars.email
            }
          })
        }
      })
    }
    return event
  },
  
  // Performance monitoring
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: [
        process.env.NEXT_PUBLIC_SITE_URL || 'localhost',
        /^https:\/\/api\.kapgel\.com\/api/,
      ],
    }),
  ],
})
```

#### Custom Metrics Dashboard
```typescript
// lib/metrics.ts (NEW FILE)
import { Sentry } from '@sentry/nextjs'

export interface CustomMetrics {
  orderCreated: (branchId: string, value: number) => void
  courierLocationUpdate: (courierId: string, latency: number) => void
  realTimeMessageDelivery: (channel: string, latency: number) => void
  rateLimitHit: (endpoint: string, clientIp: string) => void
}

export const metrics: CustomMetrics = {
  orderCreated: (branchId: string, value: number) => {
    Sentry.addBreadcrumb({
      category: 'business',
      message: 'Order created',
      data: { branchId, value },
      level: 'info',
    })
  },
  
  courierLocationUpdate: (courierId: string, latency: number) => {
    Sentry.setTag('courier_id', courierId)
    Sentry.addBreadcrumb({
      category: 'performance',
      message: 'Courier location updated',
      data: { courierId, latency },
    })
  },
  
  realTimeMessageDelivery: (channel: string, latency: number) => {
    if (latency > 2000) {
      Sentry.captureMessage(`Real-time message delivery slow: ${latency}ms`, 'warning')
    }
  },
  
  rateLimitHit: (endpoint: string, clientIp: string) => {
    Sentry.addBreadcrumb({
      category: 'security',
      message: 'Rate limit exceeded',
      data: { endpoint, clientIp },
      level: 'warning',
    })
  },
}
```

#### Health Check Endpoints
```typescript
// src/app/api/health/route.ts (NEW FILE)
import { NextResponse } from 'next/server'
import { createClient } from 'lib/supabase/server'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {
      database: 'unknown',
      redis: 'unknown',
      supabase_realtime: 'unknown',
    },
    version: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
  }

  try {
    // Database health check
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    checks.checks.database = error ? 'unhealthy' : 'healthy'
    
    // Redis health check (if enabled)
    if (process.env.UPSTASH_REDIS_REST_URL) {
      try {
        const redis = new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
        await redis.ping()
        checks.checks.redis = 'healthy'
      } catch {
        checks.checks.redis = 'unhealthy'
      }
    }
    
    // Supabase Realtime health check
    // Note: This is simplified - full implementation would test actual subscription
    checks.checks.supabase_realtime = 'healthy'
    
  } catch (error) {
    checks.status = 'unhealthy'
    checks.checks.database = 'unhealthy'
  }

  const status = Object.values(checks.checks).includes('unhealthy') ? 500 : 200
  return NextResponse.json(checks, { status })
}
```

---

### 4. Security Hardening

#### API Security Headers
```typescript
// middleware.ts (ENHANCED)
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  // CSP for XSS protection
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.sentry-cdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://*.sentry.io"
  )
  
  return response
}
```

#### Environment Variable Validation
```typescript
// lib/env.ts (NEW FILE)
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(100),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(100),
  SENTRY_DSN: z.string().url().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
})

export const env = envSchema.parse(process.env)
```

---

### 5. Deployment Pipeline

#### Zero-Downtime Deployment Strategy
```yaml
# .github/workflows/production-deploy.yml (NEW FILE)
name: Production Deployment

on:
  push:
    branches: [main]
    
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit
      - run: pnpm test:contract
      - run: pnpm build
      
  staging-deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_STAGING }}
  
  e2e-test:
    needs: staging-deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install
      - run: pnpm test:e2e
        env:
          PLAYWRIGHT_TEST_BASE_URL: ${{ needs.staging-deploy.outputs.url }}
  
  production-deploy:
    needs: [test, staging-deploy, e2e-test]
    runs-on: ubuntu-latest
    environment: production
    if: success()
    steps:
      - uses: actions/checkout@v4
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-args: '--prod'
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID_PROD }}
          
      # Post-deployment health check
      - name: Health Check
        run: |
          sleep 30  # Wait for deployment to stabilize
          curl -f https://kapgel.com/api/health || exit 1
```

#### Database Migration Strategy
```typescript
// scripts/migrate.ts (NEW FILE)
import { createClient } from 'lib/supabase/server'

export async function runMigrations() {
  const supabase = createClient()
  
  console.log('🔄 Starting database migrations...')
  
  try {
    // Check current migration version
    const { data: migrations } = await supabase
      .from('_migrations')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
    
    const currentVersion = migrations?.[0]?.version || 0
    console.log(`📍 Current migration version: ${currentVersion}`)
    
    // Apply pending migrations
    const pendingMigrations = await getPendingMigrations(currentVersion)
    
    for (const migration of pendingMigrations) {
      console.log(`⬆️  Applying migration ${migration.version}: ${migration.name}`)
      
      const { error } = await supabase.rpc('run_migration', {
        migration_sql: migration.sql,
        migration_version: migration.version,
      })
      
      if (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error)
        throw error
      }
      
      console.log(`✅ Migration ${migration.version} completed`)
    }
    
    console.log('🎉 All migrations completed successfully')
    
  } catch (error) {
    console.error('💥 Migration failed:', error)
    throw error
  }
}
```

---

## Performance Optimization *(mandatory)*

### 1. Frontend Bundle Optimization
```typescript
// next.config.ts (ENHANCED)
const nextConfig = {
  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    bundleAnalyzer: {
      enabled: true,
    },
  }),
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization
  images: {
    domains: ['supabase.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 31536000, // 1 year
  },
  
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Reduce client bundle size
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
      }
    }
    return config
  },
  
  // Headers for caching
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
```

### 2. API Response Caching
```typescript
// lib/cache.ts (NEW FILE)
import { unstable_cache } from 'next/cache'

export const getCachedVendors = unstable_cache(
  async (cityId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .eq('city_id', cityId)
      .eq('is_active', true)
    
    return data
  },
  ['vendors-by-city'],
  {
    revalidate: 300, // 5 minutes
    tags: ['vendors'],
  }
)

export const getCachedMenuItems = unstable_cache(
  async (vendorId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_available', true)
    
    return data
  },
  ['menu-items'],
  {
    revalidate: 60, // 1 minute
    tags: ['products'],
  }
)
```

---

## Disaster Recovery *(mandatory)*

### Backup Strategy
- **Database**: Supabase automated backups (daily snapshots, 7-day retention)
- **File Storage**: Supabase Storage automatic replication
- **Application State**: Stateless architecture (no backup required)
- **Configuration**: Environment variables stored in Vercel/GitHub secrets

### Recovery Procedures
```bash
# Database Point-in-Time Recovery
# 1. Contact Supabase support for PITR to specific timestamp
# 2. Verify data integrity after recovery
# 3. Update application configuration if needed

# Application Recovery  
# 1. Redeploy from known-good commit
git checkout <last-known-good-commit>
vercel --prod

# 2. Verify health endpoints
curl https://kapgel.com/api/health

# 3. Monitor error rates for 1 hour
```

### Recovery Time/Point Objectives
- **RTO (Recovery Time Objective)**: ≤4 hours
- **RPO (Recovery Point Objective)**: ≤15 minutes
- **Data Loss Tolerance**: Zero for orders and payments

---

## Acceptance Criteria *(mandatory)*

**GATE: All criteria must be met before production launch**

### Infrastructure
- [ ] Redis-based rate limiting deployed and tested
- [ ] Health check endpoints responding correctly
- [ ] Database indexes optimized for production queries
- [ ] Security headers configured and validated
- [ ] Monitoring dashboards operational

### Performance
- [ ] Bundle size ≤250KB gzipped (verified via webpack-bundle-analyzer)
- [ ] API p95 latency ≤400ms (verified via load testing)
- [ ] Rate limiting overhead ≤10ms per request
- [ ] Real-time message delivery ≤2s (verified via integration tests)

### Reliability
- [ ] Zero-downtime deployment pipeline tested
- [ ] Database migration rollback procedure validated
- [ ] Disaster recovery plan documented and tested
- [ ] 99.9% health check success rate over 1 week

### Security
- [ ] Environment variable validation implemented
- [ ] Security headers configured (verified via securityheaders.com)
- [ ] Sensitive data redaction in error logs
- [ ] API rate limiting preventing abuse

---

## Migration Timeline

### Week 11: Infrastructure Setup
- [ ] **T100:** Redis-based rate limiting implementation
- [ ] **T101:** Enhanced monitoring and health checks
- [ ] **T102:** Security hardening (headers, CSP, env validation)
- [ ] **T103:** Database index optimization

### Week 12: Deployment Pipeline
- [ ] **T104:** GitHub Actions production deployment workflow
- [ ] **T105:** Database migration automation
- [ ] **T106:** Staging environment validation
- [ ] **T107:** Production deployment dry run

### Week 13: Performance & Reliability
- [ ] **T108:** Bundle optimization and caching
- [ ] **T109:** Load testing with production-like data
- [ ] **T110:** Disaster recovery testing
- [ ] **T111:** Final security audit

---

## Risk Assessment

### High-Impact Risks
1. **Redis dependency failure**
   - **Impact**: Rate limiting fails, potential abuse
   - **Mitigation**: Memory fallback, monitoring alerts
   
2. **Database migration rollback**
   - **Impact**: Data corruption, downtime
   - **Mitigation**: Staging testing, automated rollback scripts
   
3. **Third-party service outages** (Supabase, Vercel)
   - **Impact**: Complete service unavailability
   - **Mitigation**: Status page monitoring, communication plan

### Medium-Impact Risks
4. **Performance regression**
   - **Impact**: Slow user experience
   - **Mitigation**: Performance budgets, automated testing
   
5. **Security vulnerability**
   - **Impact**: Data breach, reputation damage
   - **Mitigation**: Security headers, regular audits

---

## Review & Approval

- [ ] Infrastructure Lead Review
- [ ] Security Team Sign-off
- [ ] Engineering Lead Approval
- [ ] All production criteria validated
- [ ] Runbook documentation complete

**Next Review Date**: Week 13 (final production readiness review)

---

## Related Documents

- [testing-strategy.md](./testing-strategy.md) - Quality assurance plan
- [spec.md](./spec.md) - Functional requirements
- [plan.md](./plan.md) - Implementation roadmap
- [research.md](./research.md) - Technical investigations

---

**Last Updated**: 2025-10-07  
**Status**: ✅ Complete - Ready for Implementation