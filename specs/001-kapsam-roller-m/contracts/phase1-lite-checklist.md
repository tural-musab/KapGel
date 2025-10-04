# Phase 1-lite Constitution Closure Checklist

## Security (RLS / RBAC)
- [ ] Review `db/rls.sql` to ensure INSERT/UPDATE policies cover `orders`, `order_events`, `courier_locations`, `notification_tokens` with role-specific guards.
- [ ] Extend `lib/rbac.ts` to surface vendor/courier context via middleware and enforce transition guards for all API routes.
- [ ] Document Supabase JWT claim mapping (vendor_ids, courier_id) and validate during login handshake.
- [ ] Add contract tests for unauthorized requests across customer, vendor, courier roles.

## Observability
- [X] Introduce structured logging helper in `lib/logging.ts` (console + future provider) with correlation IDs.
- [ ] Capture order/courier lifecycle telemetry (e.g., `order_transition`, `courier_location_ping`) via Edge Functions or server actions.
- [ ] Configure error boundary + Sentry/Logflare integration outline with environment variables documented in `.env.example`.
- [ ] Define monitoring dashboard metrics (Realtime channel lag, order latency) and add to `README.md` rollout checklist.

## Accessibility & Performance Follow-ups
- [ ] Add aria-live regions for realtime status updates in order tracking and dashboards.
- [ ] Outline MapLibre lazy loading strategy and offline caching rules for service worker.
- [ ] Confirm performance budgets (FCP ≤ 2.5s, realtime propagation ≤ 2s) tracked via Lighthouse script in CI.

> Complete all checkboxes before declaring Phase 1 fully signed off.
