# Developer Quickstart: KapGel MVP

**Audience**: Engineers onboarding to `001-kapsam-roller-m` initiative  \
**Last Updated**: 2025-09-30

This quickstart explains how to set up the KapGel repository, understand the role-based architecture, and run the critical workflows for development, testing, and documentation.

---

## 1. Prerequisites

- **Node.js 20.x** (aligns with Vercel default runtime).
- **pnpm 9.x** (preferred package manager). npm works but scripts assume pnpm.
- **Supabase CLI** (`supabase`) for local Postgres + auth emulation.
- **Docker** (optional) if running Supabase locally via containers.
- **OpenSSL** for generating VAPID keys.

Install dependencies:

```bash
corepack enable
corepack prepare pnpm@9 --activate
pnpm install
```

---

## 2. Environment Configuration

Create `.env.local` with the following keys (example values for local development):

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=development-jwt-secret
NEXT_PUBLIC_MAP_TILES_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
NEXT_PUBLIC_SENTRY_DSN=
RESEND_API_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```

To generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

---

## 3. Repository Structure Overview

```
├── src/
│   ├── app/
│   │   ├── (customer)/              # Customer storefront & checkout flows
│   │   ├── vendor/                  # Vendor admin dashboard (to be implemented)
│   │   ├── courier/                 # Courier workspace (to be implemented)
│   │   ├── admin/                   # Reserved for future admin tools
│   │   └── api/                     # Server actions & route handlers
│   ├── components/                  # Shared UI widgets (Map, PushManager, InstallPWA)
│   └── lib/                         # Client/server utilities (Supabase, RBAC, stores)
├── db/                              # Drizzle schema, SQL migrations, seeds, RLS
├── workers/service-worker.ts        # PWA service worker entrypoint
├── tests/                           # Vitest unit & Playwright E2E suites
└── specs/001-kapsam-roller-m/       # Spec-kit docs (spec, plan, research, data model, quickstart, tasks)
```

Refer to `spec.md` for product scope, `plan.md` for phase sequencing, and `tasks.md` for actionable backlog.

---

## 4. Running the Stack Locally

1. **Start Supabase**

   ```bash
   supabase start
   pnpm db:push           # Applies schema via Drizzle
   pnpm db:seed           # Seeds demo data
   ```

2. **Run the Web App**

   ```bash
   pnpm dev
   ```

   Access the app at [http://localhost:3000](http://localhost:3000).

3. **Run Tests**

   ```bash
   pnpm test:unit
   pnpm test:e2e
   ```

4. **Lint & Type-Check**

   ```bash
   pnpm lint
   pnpm typecheck
   ```

---

## 5. Feature Development Workflow

1. **Consult Documentation**: Review `research.md` for technical decisions and `data-model.md` for schema constraints before coding.
2. **Update Tasks**: Amend `tasks.md` as work progresses; ensure tests are written before implementation per TDD mandate.
3. **Branching**: Use feature branches prefixed with spec ID (e.g., `feature/001-vendor-dashboard`).
4. **Testing Strategy**:
   - Write failing Vitest/Playwright specs first (Phase 3.2).
   - Implement server actions and Supabase migrations.
   - Build UI components and integrate realtime updates.
5. **Accessibility & Performance**: Run Axe checks (`pnpm test:e2e --project=axe`) and Lighthouse (in-browser) on dashboards.
6. **Observability Hooks**: Ensure new server actions log structured events and capture errors via Sentry helpers in `lib/observability.ts` (to be implemented).

---

## 6. Deployment Checklist (Pre-Production)

- [ ] CI workflow (`.github/workflows/ci.yml`) validates lint, typecheck, unit, and e2e suites.
- [ ] Supabase migrations & seeds applied to staging project.
- [ ] Environment secrets configured in Vercel + Supabase (Anon, Service, JWT, Resend, Sentry, VAPID).
- [ ] Web Push notifications verified on Chrome + Safari (manual QA).
- [ ] Vendor and courier dashboards exercised with real-time updates.
- [ ] README and specs updated with any new operational notes.

---

## 7. Support & Escalation

- **Slack Channel**: `#kapgel-mvp` for day-to-day coordination.
- **Incident Response**: Page on-call engineer via OpsGenie when order processing SLA (>5 min) is breached.
- **Documentation**: If you discover gaps, update the relevant document in `specs/001-kapsam-roller-m/` and log the change in the PR summary.

Welcome aboard! Ship safely and keep the constitution checks green.
