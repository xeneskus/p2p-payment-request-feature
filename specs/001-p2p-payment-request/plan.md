# Implementation Plan: P2P Payment Request

**Branch**: `001-p2p-payment-request` | **Date**: 2026-05-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-p2p-payment-request/spec.md`

## Summary

Build a Next.js 15 web app where signed-in users create payment requests addressed by email, share an unguessable link, and a recipient pays, declines, or lets the request expire. Persistence and authorisation are handled by Supabase Postgres with Row-Level Security; the dashboard subscribes to Supabase Realtime so both parties see status changes within seconds. Every state transition is a single SQL `UPDATE … WHERE status = 'pending' RETURNING …`, eliminating double-pay races at the database layer. Money flows through a `Money` value object that stores cents as integers; floats are excluded from the codebase. Playwright with `video: 'on'` doubles as the automated test suite and the screen-recording deliverable.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 22 LTS for tooling
**Primary Dependencies**: Next.js 15 (App Router), `@supabase/supabase-js`, `@supabase/ssr`, Zod, react-hook-form, `@hookform/resolvers`, Tailwind CSS v4, shadcn/ui (base-nova), Sonner, lucide-react
**Storage**: Supabase Postgres (managed). Two tables: `profiles` (mirror of `auth.users`) and `payment_requests`. Row Level Security is enabled on both.
**Testing**: Vitest for unit tests (Money helper, Zod schemas, lazy-expiry function). Playwright for end-to-end tests with `video: 'on'`, `screenshot: 'on'`, `trace: 'on'` — the recorded `.webm` is the assignment's screen-recording artefact.
**Target Platform**: Modern evergreen browsers (Chromium, Safari 17+, Firefox 120+). Responsive from a 375 px iPhone viewport up to 1280 px desktop.
**Project Type**: Web application (single Next.js project — frontend pages, Route Handlers, and SSR share one codebase).
**Performance Goals**: First contentful paint under 2 s on a cold dashboard load on a 4G profile; status push from Realtime visible in the UI under 2 s p95.
**Constraints**: Live demo on Vercel free tier. No background workers (lazy expiry only). No third-party payment processor (settlement is simulated).
**Scale/Scope**: Prototype: tens of users, hundreds of requests. No load testing — Supabase free tier headroom is well above the demo's needs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan complies |
|---|---|
| I. Test-First (NON-NEGOTIABLE) | `/speckit-tasks` will order failing Playwright and Vitest tests **before** each implementation task. The bootstrap commit already adds Playwright and Vitest dependencies so a failing test can be written on day one. |
| II. Money is Integer Cents (NON-NEGOTIABLE) | A single `src/lib/money.ts` value object is the only place dollar-to-cent conversion occurs. The Postgres column is `amount_cents INTEGER NOT NULL CHECK (amount_cents > 0)`. JSON bodies carry cents; the UI formats them for display only. |
| III. Defense in Depth | RLS policies on `payment_requests` express the sender/recipient predicate in SQL (`auth.uid() = from_user_id OR lower(auth.email()) = to_email`). Every Route Handler re-derives the actor from the verified session and re-checks the predicate before any mutation. Zod schemas validate inputs on both client and server. |
| IV. Race-Safe State Transitions | All three mutations (`pay`, `decline`, `cancel`) run as a single SQL `UPDATE payment_requests SET status = $next, …_at = now() WHERE id = $id AND status = 'pending' RETURNING *`. If `RETURNING` is empty the handler responds `409`. No application-level row locks; the database is authoritative. |
| V. Standard Error Envelope and HTTP Discipline | A central `ApiError` class plus a `handleApiError` helper produce `{ error: { code, message } }` JSON with the correct status code (400 / 401 / 403 / 404 / 409 / 410). Route Handlers never return bare strings or 500s for expected failures. |

No violations. The plan does not introduce additional projects, frameworks, or abstractions beyond what these principles already require.

## Project Structure

### Documentation (this feature)

```text
specs/001-p2p-payment-request/
├── plan.md              # This file (/speckit-plan output)
├── spec.md              # /speckit-specify output (already created)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI-style JSON for each API route)
├── checklists/
│   └── requirements.md  # Spec quality checklist (already passing)
└── tasks.md             # /speckit-tasks output (created after this plan)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                 # Auth-gated layout (server component)
│   │   ├── dashboard/page.tsx         # Realtime list + tabs + filter + search
│   │   └── requests/
│   │       ├── new/page.tsx           # Create form
│   │       ├── [id]/page.tsx          # Detail view (Pay/Decline/Cancel)
│   │       └── [id]/success/page.tsx  # Post-pay success screen
│   ├── pay/[token]/page.tsx           # Public read-only via shareable link
│   └── api/
│       ├── auth/session/route.ts      # POST (sign in) / DELETE (sign out)
│       ├── requests/route.ts          # POST create
│       ├── requests/[id]/pay/route.ts
│       ├── requests/[id]/decline/route.ts
│       ├── requests/[id]/cancel/route.ts
│       └── public/[token]/route.ts    # GET (redacted)
├── features/
│   ├── auth/
│   │   └── server.ts                  # getCurrentUser, requireUser
│   └── requests/
│       ├── schema.ts                  # Zod schemas (single source of truth)
│       ├── service.ts                 # DB-touching service functions
│       └── hooks.ts                   # useRequests (Realtime subscription)
├── lib/
│   ├── money.ts                       # Money value object (integer cents)
│   ├── api-error.ts                   # ApiError + handleApiError
│   ├── expiry.ts                      # Lazy expiry helper
│   └── supabase/
│       ├── client.ts                  # Browser client
│       ├── server.ts                  # RSC + Route Handler client
│       └── admin.ts                   # Service-role client (server-only)
├── components/                        # shadcn primitives + project components
│   ├── ui/                            # generated shadcn
│   ├── payment-request-row.tsx
│   ├── status-pill.tsx
│   └── expiry-countdown.tsx
└── middleware.ts                       # Edge auth-cookie guard

tests/
├── unit/                              # Vitest
│   ├── money.test.ts
│   ├── expiry.test.ts
│   └── schema.test.ts
└── e2e/                               # Playwright
    ├── auth.spec.ts
    ├── create-request.spec.ts
    ├── dashboard.spec.ts
    ├── pay-flow.spec.ts
    ├── decline-cancel.spec.ts
    └── expiration.spec.ts

supabase/
└── migrations/
    └── 0001_initial.sql               # profiles, payment_requests, RLS, indexes
```

**Structure Decision**: Single Next.js project (the "Web application" pattern, co-located rather than split into separate `frontend/` and `backend/` folders, because Next.js's App Router puts pages and Route Handlers on the same dependency graph). The `src/features/` directory keeps domain logic separate from UI concerns. The `supabase/migrations/` folder is the source of truth for schema and is replayed via the Supabase MCP `apply_migration` tool during setup.

## Complexity Tracking

*No Constitution Check violations to justify. Section intentionally left blank.*
