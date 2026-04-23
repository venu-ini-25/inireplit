# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (port 8080)
│   └── finance-saas/       # React + Vite frontend (iNi SaaS platform)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

**Current schema tables** (`src/schema/index.ts`):
- `companies` — 8 portfolio companies (name, industry, stage, investors, arrTrend/headcountTrend/burnTrend as JSONB)
- `deals` — 5 real M&A pipeline deals (stages: due_diligence, term_sheet, sourcing, loi, closed). Stage enum includes term_sheet and loi.
- `financial_snapshots` — 12 months revenue snapshots (Jan-Dec 2024; period, revenue, expenses, ebitda, arr)
- `metrics_snapshots` — 186 rows. Categories: operations/product/marketing/sales/people/cashflow/spending (scalar values) + *_trend variants (12 monthly data points each). Trend categories: operations_trend (headcount, burn, runway), product_trend (dau, mau), sales_trend (bookings_actual, bookings_quota), people_trend (new_hires, attrition_count), marketing_trend (mql), cashflow_trend (inflows, outflows).
- `engagements` — services engagement records (clientName, serviceType, status, fee, progress, deliverables, team as JSONB)
- `integration_connections` — OAuth tokens for QuickBooks/HubSpot/Stripe/Google Sheets/Gusto
- `sync_logs` — per-integration sync history
- `import_logs` — CSV/Excel bulk import audit trail

**Integration + Email + Setup completed:**
- `artifacts/api-server/src/lib/email.ts` — Resend email module (gracefully degrades when RESEND_API_KEY not set). Sends: new access request → admin, approve/deny → user, sync failure → admin
- `accessRequests.ts` wired to email: new submission, approve, deny all trigger notifications
- `integrations.ts` sync errors trigger sync failure email
- `GET /api/integrations/setup-info` — returns step-by-step setup guide per provider (QB, HubSpot, Gusto, Sheets, Stripe, email)
- `sheets.ts` — added GOOGLE_API_KEY support (public sheets via REST API v4); GOOGLE_SERVICE_ACCOUNT_JSON still works for private sheets
- Settings.tsx — Setup Guide modal for each unconfigured provider with missing env vars, redirect URI copy button, and dev console links
- Settings.tsx — Notifications tab: functional toggles saved to localStorage, email status banner, "Access Requests" alert type added
- Required env vars: RESEND_API_KEY (email delivery), GOOGLE_API_KEY or GOOGLE_SERVICE_ACCOUNT_JSON (Sheets), QB_CLIENT_ID + QB_CLIENT_SECRET (QuickBooks), HUBSPOT_CLIENT_ID + HUBSPOT_CLIENT_SECRET (HubSpot), GUSTO_CLIENT_ID + GUSTO_CLIENT_SECRET (Gusto)

**DB wiring status (all production gaps closed)**:
- `getTrendValues(category)` helper added to both Express `metrics.ts` and Vercel `_utils.ts`
- Operations: headcountTrend + burnRunway from DB ✓
- Product: DAU/MAU engagementTrend from DB ✓
- Sales: bookings actual/quota from DB ✓
- People: hiringPlan from DB (new_hires + attrition_count) ✓
- Cashflow: monthly inflows/outflows/net from DB ✓
- Portfolio summary: totalAum and avgGrowthRate computed from real company valuations ✓
- Analytics revenue: from financial_snapshots ✓ | Analytics spending: from metrics_snapshots ✓

**Re-seed the DB**: `node scripts/seed-db.mjs` (run from workspace root, requires DATABASE_URL)

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/finance-saas` (`@workspace/finance-saas`)

iNi (Invent N Invest) Finance Tech SaaS Platform — React + Vite frontend deployed to Vercel at `inventninvest.com`.

- **Auth**: Clerk (sign-in/sign-up). Admin emails hardcoded in `src/App.tsx`, `src/components/layout/Sidebar.tsx`, `src/components/layout/Layout.tsx`: `venu.vegi@inventninvest.com`, `pitch@inventninvest.com`
- **Data strategy**: Frontend calls the real Express API server (`artifacts/api-server`) for all data. API routes query Neon PostgreSQL (Drizzle ORM) with hardcoded fallbacks when specific metric keys are absent. `src/lib/mockFetch.ts` exists but is disabled (controlled by `VITE_USE_MOCK` env var, currently `false`). Demo/screenshot mode also disabled (`VITE_SCREENSHOT_MODE=false`).
- **14 pages**: Dashboard, P&L, Cash Flow, Expenses, Operations, Product, Marketing, Sales, People, Portfolio, Portfolio Detail, M&A Support, Professional Services, Reports & Analytics
- **Vercel config**: `vercel.json` — single SPA catch-all rewrite to `index.html`. Root dir: `artifacts/finance-saas`, build: `pnpm run build`, output: `dist/public`
- **Env vars on Vercel**: `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL` (Neon PostgreSQL)
- **Local dev**: `pnpm --filter @workspace/finance-saas run dev` — requires the api-server workflow to be running for real data; set `VITE_USE_MOCK=true` in `.env.local` only for demo/screenshot mode
- **Error boundaries**: `src/components/ErrorBoundary.tsx` wraps the authenticated Layout routes in `App.tsx`. Shows a user-friendly "Try Again" UI for any page-level crashes.
- **Vercel serverless functions** (`api/` directory — used in production on Vercel):
  - `api/integrations/index.ts` — `GET /api/integrations` (list all integration statuses)
  - `api/integrations/[provider]/index.ts` — `GET/DELETE /api/integrations/:provider`
  - `api/integrations/[provider]/oauth-url.ts` — `GET /api/integrations/:provider/oauth-url` (QB, HubSpot, Gusto)
  - `api/integrations/[provider]/connect.ts` — `POST /api/integrations/:provider/connect` (Stripe key, Sheets URL)
  - `api/integrations/[provider]/preview.ts` — `POST /api/integrations/:provider/preview` (Sheets column preview)
  - `api/integrations/[provider]/sync.ts` — `POST /api/integrations/:provider/sync` (Stripe live sync, Sheets row import)
  - `api/integrations/[provider]/sync-logs.ts` — `GET /api/integrations/:provider/sync-logs` (last 10 log entries)
  - `api/oauth/[provider]/callback.ts` — `GET /api/oauth/:provider/callback` (OAuth token exchange → DB upsert)
  - All protected by `requireAdmin` from `_utils.ts` (Clerk JWT or ADMIN_EMAILS env var)
  - OAuth env vars needed per provider: QB (`QB_CLIENT_ID`, `QB_CLIENT_SECRET`), HubSpot (`HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`), Gusto (`GUSTO_CLIENT_ID`, `GUSTO_CLIENT_SECRET`), Sheets (`GOOGLE_API_KEY`)

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
