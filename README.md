# KapGel MVP

KapGel is a full-stack web platform that enables local restaurants and markets **with their own courier staff** to accept delivery or pickup orders with live courier tracking. Unlike traditional delivery platforms that provide centralized courier pools, KapGel is a **logistics management platform** where each vendor manages and dispatches their own delivery team. This repository hosts the MVP implementation built with Next.js 15, Supabase, and a service-worker-powered PWA experience for customers, vendor admins, couriers, and platform operators.

## 🎯 Unique Value Proposition

**KapGel is NOT a logistics provider** — it's a logistics management tool. Key differentiators:

- **Vendor-Owned Couriers**: Only businesses with their own delivery staff can join the platform. No shared courier pool, no platform-managed logistics.
- **Full Logistics Control**: Vendors maintain complete control over their delivery operations, staff scheduling, and service quality.
- **Management Platform**: KapGel provides the order orchestration, real-time tracking infrastructure, and customer-facing experience — vendors provide the delivery capability.
- **Target Market**: Established local restaurants and markets that already have delivery staff but need better digital tools to manage orders and customer experience.

## 📖 Terminology

Understanding the key roles and entities in KapGel:

### **Business Entities**
- **Vendor**: A business entity (restaurant, market, cafe) that joins the platform to manage orders and deliveries
- **Branch**: A physical location of a vendor where orders are prepared and dispatched

### **User Roles**
- **Customer**: End users who browse menus, place orders, and track deliveries
- **Vendor Admin**: A person who manages a vendor's operations (menu, orders, courier assignments, analytics)
- **Courier**: A delivery person employed by a specific vendor (not shared across vendors)
- **Platform Admin**: System administrators who manage vendor approvals and platform operations

### **Key Distinctions**
- **Vendor** = The business | **Vendor Admin** = The person managing that business
- **Courier Ownership**: Each courier belongs to exactly one vendor (no shared courier pool)
- **Management**: Vendor admins assign their own couriers to orders (KapGel provides tools, not couriers)

### **Order Flow**
1. **Customer** places order at a **vendor's branch**
2. **Vendor admin** confirms order and assigns their **courier**
3. **Courier** picks up and delivers to **customer**
4. Platform provides tracking and communication tools throughout

## 🚀 Feature Overview

- **Vendor-managed courier system**: Each vendor operates with their own courier staff (no shared courier pool).
- **Başvuru merkezli işletme onboarding**: Vendor adayları kayıt sonrası başvuru formu doldurur, admin onayıyla vendor paneline geçilir.
- Role-specific dashboards for customers, vendor admins, couriers, and admins (vendor/courier panels in progress).
- Real-time order orchestration backed by Supabase Realtime and an `order_events` timeline.
- MapLibre + OpenStreetMap integration for delivery zones and courier location tracking.
- Web Push notifications with email fallback via Supabase Edge Functions and Resend.
- Progressive Web App shell with offline cart support and install prompts.

For the full product specification, see [`specs/001-kapsam-roller-m/spec.md`](specs/001-kapsam-roller-m/spec.md).

## 🧱 Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript 5 + Tailwind CSS + shadcn/ui.
- **Backend/Data**: Supabase Postgres (migrations via Supabase CLI) with PostGIS for geospatial features and lightweight TypeScript stubs for IDE hints.
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
   Supabase migrations now live in `supabase/migrations/`. The SQL support files under `db/` (schema snapshot, RLS helpers, seeds, and the read-only `schema.ts` type stubs) should be kept in sync by running the Supabase CLI workflow above.

4. **Run the App**
   ```bash
   pnpm dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) to verify the storefront.

## 🎯 Getting Started for Developers

**New to the project?** Follow this path:

### 1. Read the Foundation Documents (30 minutes)
- [`README.md`](README.md) ← You are here
- [`specs/001-kapsam-roller-m/spec.md`](specs/001-kapsam-roller-m/spec.md) - Product requirements
- [`specs/001-kapsam-roller-m/data-model.md`](specs/001-kapsam-roller-m/data-model.md) - Database schema

### 2. Understand the Development Workflow (15 minutes)
- **[`TODO.md`](TODO.md)** ← **START HERE** - Actionable task list
- [`docs/DEVELOPMENT-ROADMAP.md`](docs/DEVELOPMENT-ROADMAP.md) - Detailed 6-week plan
- [`specs/001-kapsam-roller-m/plan.md`](specs/001-kapsam-roller-m/plan.md) - Overall strategy

### 3. Learn the Contract-Driven Approach (30 minutes)
- [`specs/001-kapsam-roller-m/contracts/`](specs/001-kapsam-roller-m/contracts/) - API specifications
- [`tests/contract/README.md`](tests/contract/README.md) - Testing guidelines

### 4. Start Your First Task (2-3 hours)
```bash
# 1. Open TODO.md
code TODO.md

# 2. Pick a [ ] unchecked task (start with Week 5)
# 3. Read the referenced contract (📖 icon)
# 4. Run the contract test (it should fail)
npm run test:contract

# 5. Implement the feature
# 6. Make the test pass
# 7. Mark task complete [X] in TODO.md
```

### Quick Reference Card

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [`TODO.md`](TODO.md) | **Daily task list** | Every morning ⭐ |
| [`docs/DEVELOPMENT-ROADMAP.md`](docs/DEVELOPMENT-ROADMAP.md) | Detailed weekly plan | When starting a new week |
| [`specs/001-kapsam-roller-m/contracts/`](specs/001-kapsam-roller-m/contracts/) | API contracts | Before implementing each feature |
| [`db/rls-complete.sql`](db/rls-complete.sql) | Security policies | When working with database |
| [`tests/contract/`](tests/contract/) | Contract tests | Continuously (TDD) |

### Development Philosophy

```
1. Read Contract     → What should the API do?
2. Run Test (fails)  → What does success look like?
3. Implement         → Write code to match contract
4. Test Passes       → Validation ✅
5. Mark TODO         → Track progress
```

## ✅ Quality Gates

| Command | Purpose |
| --- | --- |
| `pnpm lint` | ESLint checks for TypeScript/React code. |
| `pnpm typecheck` | TypeScript type safety validation. |
| `pnpm test:unit` | Vitest unit suite (RBAC, utilities). |
| `pnpm test:contract` | Contract compliance tests (API specifications). |
| `pnpm test:e2e` | Playwright scenarios for customer/vendor/courier flows. |
| `pnpm test:e2e --headed` | Optional headed run for manual accessibility and UX review (Axe automation pending). |

CI iş akışı (`.github/workflows/ci.yml`) pnpm bağımlılıklarını kurup Supabase şemasını uygular, ardından lint, build ve test komutlarını çalıştırır.

The CI pipeline uses the Supabase CLI to push schema changes; when you add migrations under `supabase/migrations/`, ensure the same `supabase db push` step continues to pass.

## 🗂️ Repository Map

```
📦 kapgel/
├── 📄 TODO.md                          ← **START HERE** (Daily tasks)
├── 📄 README.md                        ← You are here
├── 📁 docs/
│   ├── DEVELOPMENT-ROADMAP.md          ← Detailed 6-week plan
│   └── performance-budgets.md          ← Performance targets
├── 📁 specs/001-kapsam-roller-m/
│   ├── spec.md                         ← Product specification
│   ├── plan.md                         ← Implementation roadmap
│   ├── data-model.md                   ← Database schema & state machine
│   ├── tasks.md                        ← Task tracking (synced with TODO.md)
│   ├── quickstart.md                   ← Developer onboarding
│   ├── research.md                     ← Technical decisions
│   └── 📁 contracts/                   ← **API Contracts** (Read before coding!)
│       ├── README.md
│       ├── courier-location-api.md
│       ├── orders-api.md
│       ├── vendor-api.md
│       ├── notifications-api.md
│       └── realtime-channels.md
├── 📁 src/
│   ├── app/                            ← Next.js App Router pages
│   ├── components/                     ← Shared UI components
│   └── lib/                            ← Utilities (Supabase, RBAC, logger)
├── 📁 db/
│   ├── schema.sql                      ← Schema snapshot
│   ├── rls-complete.sql                ← **Security policies**
│   └── seed.mjs                        ← Test data
├── 📁 supabase/migrations/             ← Database migrations
├── 📁 tests/
│   ├── contract/                       ← **Contract tests** (TDD)
│   ├── e2e/                            ← Playwright E2E tests
│   └── unit/                           ← Vitest unit tests
└── 📁 workers/                         ← Service worker (PWA)
```

## 🧭 Roadmap Highlights

**Current Phase: Week 5 (Implementation)**

- ✅ **Phase 1 (Week 1-4):** API contracts, RLS policies, RBAC middleware, observability
- 🟡 **Phase 2 (Week 5-6):** Vendor & courier dashboards, courier location API
- 🔴 **Phase 3 (Week 7-10):** Integration (Push, Maps, Realtime), performance, launch prep

Track actionable items in [`TODO.md`](TODO.md) and [`specs/001-kapsam-roller-m/tasks.md`](specs/001-kapsam-roller-m/tasks.md).

**Progress:**
```
Week 5:  [▱▱▱▱▱▱▱▱▱▱] 0/15 tasks  ← Current week
Week 6:  [▱▱▱▱▱▱▱▱▱▱] 0/7 tasks
Week 7-9: [▱▱▱▱▱▱▱▱▱▱] 0/8 tasks
Week 10: [▱▱▱▱▱▱▱▱▱▱] 0/6 tasks

Overall: 0/36 tasks (0%) - Ready to start! 🚀
```

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/xyz`).
2. Check [`TODO.md`](TODO.md) for current priorities.
3. Read the relevant API contract in [`specs/001-kapsam-roller-m/contracts/`](specs/001-kapsam-roller-m/contracts/).
4. Write/run contract tests first (TDD approach).
5. Implement the feature following the contract.
6. Ensure linting, type checks, and tests pass.
7. Update [`TODO.md`](TODO.md) and mark task complete.
8. Include links to relevant spec-kit documents in PR descriptions.

For additional context, consult the research log and data model documents under `specs/001-kapsam-roller-m/`.

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Contract Testing Guide](https://martinfowler.com/bliki/ContractTest.html)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- [Web Push Protocol](https://web.dev/push-notifications-overview/)

---

**🎯 Quick Start:** Read [`TODO.md`](TODO.md) → Pick a task → Read contract → Test → Implement → Ship!
