# Performance Budgets

**Version:** 1.0  
**Last Updated:** 2025-10-05  
**Status:** Active  
**Based on:** plan.md - Hafta 3, Gün 15

---

## Overview

Performance budgets define acceptable thresholds for key metrics. Exceeding these budgets should trigger alerts and block deployment.

---

## Core Web Vitals Targets

| Metric | Target | Maximum | Description |
|--------|--------|---------|-------------|
| **LCP** (Largest Contentful Paint) | ≤ 2.0s | 2.5s | Time for main content to load |
| **FID** (First Input Delay) | ≤ 50ms | 100ms | Time to interactive |
| **CLS** (Cumulative Layout Shift) | ≤ 0.05 | 0.1 | Visual stability |
| **FCP** (First Contentful Paint) | ≤ 1.5s | 2.0s | Time to first content |
| **TTFB** (Time to First Byte) | ≤ 500ms | 800ms | Server response time |

**Measurement:** 75th percentile of real user measurements

---

## Bundle Size Budgets

### JavaScript Bundles

| Bundle | Target | Maximum | Notes |
|--------|--------|---------|-------|
| **Initial JS** (gzipped) | ≤ 150KB | 200KB | First page load |
| **Total JS** (gzipped) | ≤ 300KB | 400KB | All JavaScript |

### CSS Bundles

| Bundle | Target | Maximum |
|--------|--------|---------|
| **Total CSS** (gzipped) | ≤ 40KB | 60KB |

---

## API Response Times

| Endpoint | Target (p50) | Maximum (p95) | Timeout |
|----------|--------------|---------------|---------|
| **GET /api/orders** | ≤ 150ms | 300ms | 5s |
| **POST /api/orders** | ≤ 300ms | 500ms | 10s |
| **RPC insert_courier_location** | ≤ 50ms | 100ms | 2s |

---

## Monitoring & Enforcement

### Lighthouse CI

**Thresholds:**
- Performance: ≥ 90
- Accessibility: ≥ 90
- LCP: ≤ 2.5s
- CLS: ≤ 0.1

### Bundle Analysis

Check on every build:
```bash
npm run build -- --analyze
```

---

## Related Documentation

- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
