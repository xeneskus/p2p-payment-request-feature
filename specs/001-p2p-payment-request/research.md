# Research: P2P Payment Request

**Phase 0 of /speckit-plan output. Purpose: record technical choices and their rationales so the plan, data-model, and contracts can be derived deterministically.**

## R1. Why Supabase (Postgres + Auth + Realtime + RLS)

**Decision**: Supabase managed Postgres for persistence, Supabase Auth for email+password, Supabase Realtime for dashboard push, Postgres Row Level Security for authorisation.

**Rationale**:

- Row Level Security expresses the sender/recipient predicate in SQL once and is enforced at the data layer; the application layer can reuse the same predicate without inventing a second authorisation model.
- Supabase Realtime ships out of the box; the dashboard's "status reflected in both lists" requirement (FR-013) is a single channel subscription, not a custom websocket server.
- One managed dependency satisfies storage, auth, and realtime — fewer moving parts on a four-hour prototype.

**Alternatives considered**:

- Firebase: equivalent breadth, but Firestore's per-document security rules are harder to audit than SQL policies and the integer-cents constraint is not enforceable at the schema level.
- Plain Postgres on Vercel Postgres + NextAuth: more glue code, no managed realtime, and the assignment's 3-4 hour budget would not absorb the wiring.

## R2. Why Next.js 15 (App Router)

**Decision**: Next.js 15 with the App Router, deployed on Vercel.

**Rationale**: Server Components allow each page to fetch the user's session and initial data inside the same request, eliminating a flash of unauthenticated content. Route Handlers (`route.ts`) give us typed JSON endpoints next to the pages that consume them. Vercel's free tier covers the prototype's traffic.

## R3. Money is integer cents

**Decision**: Amounts are stored as `INTEGER` cents in Postgres, transported as integers in API bodies, and handled in TypeScript via a `Money` class whose constructor is private. Conversion to and from dollars happens only at the UI boundary.

**Rationale**: Floating-point arithmetic introduces drift that, in a payments product, is a defect. A private constructor + factory methods (`Money.fromCents`, `Money.fromDollars`) is the cheapest way to make incorrect construction a compile-time error.

## R4. Race-safe state transitions via SQL precondition

**Decision**: Each mutation (`pay`, `decline`, `cancel`) runs as a single `UPDATE payment_requests SET status = $next, …_at = now() WHERE id = $id AND status = 'pending' RETURNING *` from the API handler. If the returned row set is empty the handler emits a `409 CONFLICT` with code `not_pending`.

**Rationale**: This is the textbook protection against double-spend on a state machine. Two concurrent `pay` calls race to the same row; Postgres serialises them at the row lock; exactly one succeeds. No application-level mutex is required.

**Alternatives considered**:

- `SELECT … FOR UPDATE` inside an explicit transaction: more code, no additional safety because the `UPDATE WHERE` already does the locking work.
- Optimistic-concurrency-control with a `version` column: more machinery without buying anything for this finite, terminal-state state machine.

## R5. Expiry is computed lazily

**Decision**: Requests are not preemptively transitioned to `Expired` by a background worker. Every read computes `request.status === 'pending' && request.expires_at < now() ? 'expired' : request.status`. Every mutation handler re-validates the same predicate before issuing the `UPDATE`.

**Rationale**: The prototype has no scheduler; a real cron would be overkill for a feature where stale rows are harmless. Lazy expiry is also easier to test — the Vitest unit on `lib/expiry.ts` is one function with five table-driven cases.

## R6. Auth strategy: email + password (no magic link, no SSO)

**Decision**: Email + password, via Supabase Auth, with `confirm_email = false` for the demo. Sessions are HttpOnly cookies set by `@supabase/ssr`.

**Rationale**: The assignment explicitly allows "magic link or mock auth"; password is cheaper to test (two users, switch fast, no email round-trip). The prototype is not a production identity system.

## R7. Realtime for dashboards, server-rendered detail pages

**Decision**: The dashboard subscribes to a Supabase Realtime channel filtered by the user's UID/email, updating its rows on `UPDATE` events. The detail page (`/requests/[id]`) is a server-rendered Server Component that revalidates on navigation; live updates there are not required by the spec.

**Rationale**: The spec's "status reflected in both dashboards within seconds" (FR-013) is the only live-update need. The detail page is short-lived in user flow (open, act, leave) so a fresh render on each visit is enough.

## R8. UI: shadcn/ui (base-nova) + Tailwind v4

**Decision**: shadcn/ui's `base-nova` style on top of Tailwind v4, plus `lucide-react` for icons and `sonner` for toasts.

**Rationale**: shadcn primitives ship as source we can edit (no design tokens locked inside a node_modules package), and `base-nova` matches the spare, fintech-adjacent look the assignment scoring rubric implicitly rewards.

## R9. Test strategy

**Decision**: Vitest for `lib/money.ts`, `lib/expiry.ts`, and `features/requests/schema.ts`. Playwright for the five user-visible flows (auth, create, dashboard browse, pay+decline+cancel, expiration). Both run in CI on every push.

**Rationale**: The spec's success criteria are mostly user-visible behaviours, which Playwright is good at; the few invariants that are hard to assert in a browser (cents-to-dollars roundtrip, expiry boundary) are exactly what Vitest is good at.

**Recording**: Playwright's `video: 'on'` produces a `.webm` per spec which doubles as the assignment's screen-recording deliverable.

## R10. Deploy target

**Decision**: Vercel for the Next.js app; Supabase managed instance for the database. Both have free tiers that cover this demo without billing surprises.
