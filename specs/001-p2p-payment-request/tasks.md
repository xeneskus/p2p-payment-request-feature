---

description: "Task list for P2P Payment Request feature (001)"
---

# Tasks: P2P Payment Request

**Input**: Design documents from `/specs/001-p2p-payment-request/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: Tests are mandated by constitution principle I (Test-First, NON-NEGOTIABLE). Tests precede implementation in every story.

**Organization**: Tasks are grouped by user story (US1–US5) so each can be implemented and shipped independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (touches different files, no dependencies on uncompleted tasks).
- **[Story]**: US1 = Send a request, US2 = Pay, US3 = Decline/Cancel, US4 = Browse/Search, US5 = Public link.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Scaffold Next.js 15 project via `pnpm create next-app@latest . --typescript --tailwind --app --eslint --src-dir --use-pnpm` (already in current `P2P Payment Request Feature` directory)
- [ ] T002 Install runtime dependencies: `pnpm add @supabase/supabase-js @supabase/ssr zod react-hook-form @hookform/resolvers sonner lucide-react`
- [ ] T003 [P] Install dev dependencies: `pnpm add -D @playwright/test vitest @vitest/coverage-v8 prettier husky lint-staged`
- [ ] T004 [P] Initialise shadcn/ui (base-nova style): `pnpm dlx shadcn@latest init` and add `button card dialog input label select tabs badge` components
- [ ] T005 Write `playwright.config.ts` with `video: 'on'`, `screenshot: 'on'`, `trace: 'on'` and Chromium + iPhone-14 projects
- [ ] T006 Write `vitest.config.ts` with `globals: true` and the `node` environment
- [ ] T007 Add npm scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test:unit`, `test:e2e`
- [ ] T008 Add `.env.example` listing the three Supabase variables; verify `.env.local` is gitignored

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Domain primitives and infrastructure that every user story depends on.

**⚠️ CRITICAL**: No user-story implementation may begin until this phase is complete.

### Tests (write first, ensure they FAIL)

- [ ] T009 [P] Write unit test `tests/unit/money.test.ts` covering `Money.fromCents`, `Money.fromDollars`, rejection of negatives, rejection of non-integers, ceiling at `100_000_000` cents.
- [ ] T010 [P] Write unit test `tests/unit/expiry.test.ts` covering "pending + future expiry = pending", "pending + past expiry = expired", "paid + past expiry = paid (terminal unchanged)".
- [ ] T011 [P] Write unit test `tests/unit/schema.test.ts` covering the create-request Zod schema's rejection of bad emails, zero/negative amounts, oversized notes, and self-request.

### Implementation

- [ ] T012 [P] Implement `src/lib/money.ts` (private constructor, `fromCents`, `fromDollars`, `cents`, `format`).
- [ ] T013 [P] Implement `src/lib/expiry.ts` (`effectiveStatus(row)` and `isExpired(row)`).
- [ ] T014 [P] Implement `src/lib/api-error.ts` (`ApiError` class with `code`, `message`, `httpStatus`; `handleApiError` route helper).
- [ ] T015 Implement `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts` (cookie-aware SSR client, browser client, service-role admin client).
- [ ] T016 Implement `src/features/requests/schema.ts` (Zod schemas: credentials, create-request, list-query, request response shape, action body).
- [ ] T017 Implement `src/features/auth/server.ts` (`getCurrentUser`, `requireUser` helpers).
- [ ] T018 Implement `src/middleware.ts` (edge cookie check, redirect unauthenticated `/dashboard` → `/login`).
- [ ] T019 Author `supabase/migrations/0001_initial.sql` (profiles, payment_requests, RLS policies, indexes per data-model.md) and apply it via Supabase MCP `apply_migration`.

**Checkpoint**: Domain helpers green; schema deployed; auth scaffolding in place. User stories can now begin.

---

## Phase 3: User Story 1 - Send a Payment Request (Priority: P1) 🎯 MVP

**Goal**: A signed-in user can fill in a form and create a payment request that appears in their Outgoing list with status `Pending` and a shareable link.

**Independent Test**: Sign in → `/requests/new` → fill `bob@example.test`, `40.00`, `Concert tickets` → submit → assertion: new row visible in Outgoing tab with status `Pending` and non-empty shareable link.

### Tests (write first, ensure they FAIL)

- [ ] T020 [US1] Playwright `tests/e2e/auth.spec.ts` — register two accounts, sign out, sign in, redirect to `/dashboard`.
- [ ] T021 [US1] Playwright `tests/e2e/create-request.spec.ts` — happy path + four validation rejections (negative amount, zero, malformed email, self-request).

### Implementation

- [ ] T022 [P] [US1] Build `src/app/(auth)/login/page.tsx` and `src/app/(auth)/register/page.tsx` (Server Components + react-hook-form sign-in / register actions).
- [ ] T023 [P] [US1] Build `src/app/(app)/layout.tsx` (auth-gated layout that hydrates the current user).
- [ ] T024 [P] [US1] Build `src/app/(app)/requests/new/page.tsx` (form with email, amount, note; uses Zod schema from T016).
- [ ] T025 [US1] Implement `src/app/api/requests/route.ts` POST (`/api/requests`): parse body via Zod, reject self-request, insert via service-role client, return `201`.
- [ ] T026 [US1] Wire toast feedback (Sonner) and redirect to `/dashboard` on success.

**Checkpoint**: User Story 1 fully functional and testable.

---

## Phase 4: User Story 2 - Pay an Incoming Request (Priority: P1)

**Goal**: A recipient of a `Pending` request can press Pay, see a 2-3 second loading state, then a success page; status flips to `Paid` for both parties via Realtime.

**Independent Test**: Sender creates request (from US1); switch to recipient session → request appears in Incoming → open detail → press Pay → wait → success screen → assertion: status `Paid` in both dashboards within five seconds.

### Tests (write first, ensure they FAIL)

- [ ] T027 [US2] Playwright `tests/e2e/dashboard.spec.ts` — Outgoing list, Incoming list, Realtime status update visible without manual refresh.
- [ ] T028 [US2] Playwright `tests/e2e/pay-flow.spec.ts` — two-user choreography: sender creates, recipient pays, success page renders, both lists reflect `Paid`.

### Implementation

- [ ] T029 [P] [US2] Implement `src/features/requests/service.ts` (`createRequest`, `listRequests`, `getRequestById`, `applyAction`).
- [ ] T030 [P] [US2] Implement `src/features/requests/hooks.ts` (`useRequests({ direction })` with `supabase.channel('payment_requests:*').on('postgres_changes', ...)`).
- [ ] T031 [US2] Build `src/app/(app)/dashboard/page.tsx` (tabs, status filter chips, search input, list rendered via `useRequests`).
- [ ] T032 [P] [US2] Build `src/components/payment-request-row.tsx`, `status-pill.tsx`, `expiry-countdown.tsx`.
- [ ] T033 [P] [US2] Build `src/app/(app)/requests/[id]/page.tsx` (detail view with Pay button when applicable) and `src/app/(app)/requests/[id]/success/page.tsx`.
- [ ] T034 [US2] Implement `src/app/api/requests/[id]/pay/route.ts` (2.5 s simulated delay → `UPDATE … WHERE status='pending' AND expires_at > now() RETURNING *` → 200/409/410).

**Checkpoint**: MVP — sender + recipient flow complete end-to-end.

---

## Phase 5: User Story 3 - Decline / Cancel (Priority: P2)

**Goal**: Recipient can decline; sender can cancel; terminal status visible to both.

**Independent Test**: Two requests in `Pending`. Recipient declines one → status `Declined`. Sender cancels the other → status `Cancelled`. Neither offers further actions afterwards.

### Tests (write first, ensure they FAIL)

- [ ] T035 [US3] Playwright `tests/e2e/decline-cancel.spec.ts` — both flows including denial of action on terminal states.

### Implementation

- [ ] T036 [P] [US3] Implement `src/app/api/requests/[id]/decline/route.ts` (mirrors pay handler, no delay).
- [ ] T037 [P] [US3] Implement `src/app/api/requests/[id]/cancel/route.ts` (sender-only, mirrors decline).
- [ ] T038 [US3] Add Decline / Cancel buttons + confirmation dialogs to the detail page.

**Checkpoint**: All three user-driven state transitions available.

---

## Phase 6: User Story 4 - Browse and Search the Dashboard (Priority: P2)

**Goal**: User can switch tabs, filter by status, and search by counterparty email substring.

**Independent Test**: Seed five requests with varied statuses and recipients. Apply each filter chip and confirm only matching rows remain. Type a substring and confirm only matching rows remain.

### Tests (write first, ensure they FAIL)

- [ ] T039 [US4] Extend `tests/e2e/dashboard.spec.ts` with status-filter and search-query assertions.

### Implementation

- [ ] T040 [P] [US4] Implement client-side filtering on the dashboard (chips for `pending`, `paid`, `declined`, `cancelled`, `expired`).
- [ ] T041 [P] [US4] Implement debounced free-text search; match on counterparty email or display name (case-insensitive substring).

**Checkpoint**: Dashboard is fully usable for someone with many requests.

---

## Phase 7: User Story 5 - Public Shareable Link (Priority: P3)

**Goal**: Anyone with the shareable link sees a redacted, read-only view of the request.

**Independent Test**: Open the link in a private window. Page renders amount, note, sender display name, and status. Recipient email is not in the DOM. Invalid token → 404 page.

### Tests (write first, ensure they FAIL)

- [ ] T042 [US5] Playwright `tests/e2e/expiration.spec.ts` — manually backdate a row's `expires_at`; opening it as recipient shows expired status and refuses Pay. Same spec covers the unknown-token 404 path via the public route.

### Implementation

- [ ] T043 [P] [US5] Implement `src/app/api/public/[token]/route.ts` (GET; service-role client; redacted projection).
- [ ] T044 [P] [US5] Build `src/app/pay/[token]/page.tsx` (server-rendered, read-only, sign-in CTA when applicable).

**Checkpoint**: All five user stories shipped.

---

## Phase 8: Polish

- [ ] T045 [P] Configure Husky + lint-staged: Prettier + ESLint on pre-commit, `pnpm typecheck` on pre-push.
- [ ] T046 [P] Add `.github/workflows/ci.yml` running lint, typecheck, unit, and e2e on push.
- [ ] T047 [P] Write `README.md`: live demo URL, screen-recording link, tech stack, AI tools used, Spec-Kit artefacts, setup instructions, test commands.
- [ ] T048 [P] Write `docs/cover-note.md` — 2-3 paragraphs: most challenging part, how AI helped or hindered, key trade-offs.
- [ ] T049 Deploy to Vercel; set the three Supabase env vars; add the production URL to Supabase Auth → URL configuration.
- [ ] T050 Manual two-window smoke test on the live URL; record Playwright run for the screen-recording deliverable; link the `.webm` from the README.

---

## Dependency Graph

```
T001 → T002 → T003,T004,T005,T006,T007,T008  (Setup)
  └─→ T009..T011 (foundational tests, parallel)
       └─→ T012..T018 (foundational impl, mostly parallel)
            └─→ T019 (migration; requires Supabase MCP auth)
                 ├─→ T020,T021 (US1 tests, parallel)
                 │    └─→ T022..T026 (US1 impl)
                 ├─→ T027,T028 (US2 tests, parallel)
                 │    └─→ T029..T034 (US2 impl)
                 ├─→ T035 → T036..T038 (US3)
                 ├─→ T039 → T040,T041 (US4)
                 └─→ T042 → T043,T044 (US5)
                      └─→ T045..T050 (polish + deploy)
```

## Notes

- `[P]` tasks within a phase touch different files; they can be parallelised by separate agents or fan-out.
- Phase 2 must complete before any Phase 3+ user story starts; the foundational types and Supabase clients are inputs to every story.
- Each phase ends with a checkpoint where the prior work is independently testable — useful for "ship the smallest slice" demos.
