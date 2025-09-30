# KapGel MVP

KapGel is a full-stack web platform that enables local restaurants and markets to accept delivery or pickup orders with live courier tracking. This repository hosts the MVP implementation built with Next.js 15, Supabase, and a service-worker-powered PWA experience for customers, vendor admins, couriers, and platform operators.

## 🚀 Feature Overview

- Role-specific dashboards for customers, vendor admins, couriers, and admins (vendor/courier panels in progress).
- Real-time order orchestration backed by Supabase Realtime and an `order_events` timeline.
- MapLibre + OpenStreetMap integration for delivery zones and courier location tracking.
- Web Push notifications with email fallback via Supabase Edge Functions and Resend.
- Progressive Web App shell with offline cart support and install prompts.

For the full product specification, see [`specs/001-kapsam-roller-m/spec.md`](specs/001-kapsam-roller-m/spec.md).

## 🧱 Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript 5 + Tailwind CSS + shadcn/ui.
- **Backend/Data**: Supabase Postgres (SQL migrations via Supabase CLI) with Drizzle ORM for type inference, PostGIS for geospatial features.
- **Realtime**: Supabase Realtime channels for orders and courier telemetry.
- **State Management**: Zustand for cart/session; React Query planned for dashboard data fetching.
- **Testing**: Vitest (unit) and Playwright (end-to-end) with accessibility checks via Axe.
- **Tooling**: pnpm, Supabase CLI, ESLint, Prettier, service worker tooling.

## 🛠️ Prerequisites

- Node.js 20+
- pnpm 9 (enable via Corepack)
- Supabase CLI (`supabase`) for local database/auth
- Docker (optional) if running Supabase locally via containers
- OpenSSL for generating VAPID keys (Web Push)

## ⚙️ Setup

1. **Install Dependencies**
   ```bash
   corepack enable
   corepack prepare pnpm@9 --activate
   pnpm install
   ```
2. **Configure Environment**
   Create `.env.local` with the following keys (see [`quickstart.md`](specs/001-kapsam-roller-m/quickstart.md) for details):
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   SUPABASE_JWT_SECRET=development-jwt-secret
   NEXT_PUBLIC_MAP_TILES_URL=https://tile.openstreetmap.org/{z}/{x}/{y}.png
   NEXT_PUBLIC_SENTRY_DSN=
   RESEND_API_KEY=
   VAPID_PUBLIC_KEY=
   VAPID_PRIVATE_KEY=
   ```
   Generate VAPID keys with `npx web-push generate-vapid-keys`.
3. **Start Supabase & Apply Schema**
   ```bash
   supabase start
   supabase db push
   pnpm db:seed
   ```
   The SQL files in `db/` (schema, migrations, RLS) are the single source of truth; use the Supabase CLI workflow (`supabase db push` or `pnpm db:push`) to apply changes.
4. **Run the App**
   ```bash
   pnpm dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to verify the storefront.

## ✅ Quality Gates

| Command | Purpose |
| --- | --- |
| `pnpm lint` | ESLint checks for TypeScript/React code. |
| `pnpm typecheck` | TypeScript type safety validation. |
| `pnpm test:unit` | Vitest unit suite (RBAC, utilities). |
| `pnpm test:e2e` | Playwright scenarios for customer/vendor/courier flows. |
| `pnpm test:e2e --headed` | Optional headed run for manual accessibility and UX review (Axe automation pending). |

A CI workflow (`.github/workflows/ci.yml`) is pending (see `tasks.md` T008).

The CI pipeline uses the Supabase CLI to push schema changes; when you add migrations under `db/`, ensure the same `supabase db push` step continues to pass.

## 🗂️ Repository Map

```
src/
├── app/               # App Router routes per role (customer, vendor, courier, admin)
├── components/        # Shared UI components (Map, PushManager, InstallPWA)
├── lib/               # Client/server utilities (Supabase, RBAC, stores)
├── workers/           # Service worker entry point
├── tests/             # Playwright + Vitest suites
└── specs/001-kapsam-roller-m/
    ├── spec.md        # Product specification
    ├── plan.md        # Implementation roadmap
    ├── research.md    # Technical investigations & risk mitigations
    ├── data-model.md  # Schema, state machine, access controls
    ├── quickstart.md  # Developer onboarding & workflows
    └── tasks.md       # Execution checklist
```

## 🧭 Roadmap Highlights

- Phase 1: Finalise API contracts, RBAC middleware, realtime triggers, and observability wiring.
- Phase 2: Implement vendor & courier dashboards, courier location API, and Web Push subscription flows.
- Phase 3: Performance hardening, accessibility audits, and launch readiness (CI, runbooks, release checklist).

Track actionable items in [`specs/001-kapsam-roller-m/tasks.md`](specs/001-kapsam-roller-m/tasks.md).

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/xyz`).
2. Update documentation/specs as scope evolves.
3. Ensure linting, type checks, and tests pass before opening a PR.
4. Include links to relevant spec-kit documents in PR descriptions.

For additional context, consult the research log and data model documents under `specs/001-kapsam-roller-m/`.
