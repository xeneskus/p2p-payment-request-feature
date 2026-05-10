# P2P Payment Request

> A peer-to-peer payment request app — request money from a friend by email, share a link, and let them pay, decline, or cancel. Built for the Lovie interview assignment with the **GitHub Spec-Kit** workflow.

**🔗 Live demo:** _to be filled in after Vercel deploy_
**🎬 Screen recording:** _Playwright videos in `playwright-report/` once `pnpm test:e2e` runs._

---

## What's in this repo

- **Spec-driven** with the official [GitHub Spec-Kit](https://github.com/github/spec-kit) v0.8.7 workflow — `constitution → specify → plan → tasks → implement`. The four artefacts live under [`specs/001-p2p-payment-request/`](./specs/001-p2p-payment-request) and [`.specify/memory/constitution.md`](./.specify/memory/constitution.md). Every commit message references the phase it belongs to.
- **Race-safe payments** — every state transition runs in a single `UPDATE payment_requests SET status = '<next>' WHERE id = $1 AND status = 'pending' AND expires_at > now() RETURNING *`. Two simultaneous Pay calls yield exactly one `paid` and one `409 not_pending`.
- **Real-time dashboard** — Supabase Realtime channel keeps both parties' lists in sync within seconds; no manual refresh.
- **Money is integer cents** — a `Money` value object with a private constructor is the only place dollar-to-cent conversion happens. Floats never touch monetary values.
- **Defense in depth** — Zod validates inputs on both client and server; Postgres Row Level Security policies express the sender/recipient predicate at the database layer.
- **Standard error envelope** — `400 / 401 / 403 / 404 / 409 / 410` discipline; one `ApiError` class.
- **36 unit tests** (Vitest) covering `Money`, lazy expiry, and Zod schemas. **Playwright** is configured with `video: 'on'`, `screenshot: 'on'`, `trace: 'on'` so the test run itself is the screen-recording deliverable.

---

## Tech stack

| Layer         | Choice                                     |
| ------------- | ------------------------------------------ |
| Framework     | Next.js 16 (App Router), TypeScript strict |
| Database      | Supabase Postgres                          |
| Auth          | Supabase Auth (email + password)           |
| Authorization | Postgres Row Level Security                |
| Realtime      | Supabase Realtime (channels)               |
| Validation    | Zod (client + server, single schema)       |
| Forms         | react-hook-form + Zod resolver             |
| Styling       | Tailwind v4 + shadcn/ui (base-nova)        |
| Icons         | lucide-react                               |
| Toasts        | Sonner                                     |
| E2E tests     | Playwright (Chromium + iPhone 14)          |
| Unit tests    | Vitest                                     |
| Hosting       | Vercel                                     |

---

## AI tools used

- **Claude Code** — primary coding agent. Every Spec-Kit artefact (constitution, spec, plan, tasks) was produced by stepping through the official `/speckit-*` skills inside Claude Code. Implementation followed the task list one phase at a time.
- **GitHub Spec-Kit v0.8.7** — the official toolkit. Initialised with `uvx --from git+https://github.com/github/spec-kit.git@v0.8.7 specify init . --integration claude`. The eight `/speckit-*` skills under `.claude/skills/` drive the workflow.
- **Supabase MCP** — for managing the remote Supabase project from inside Claude Code: created the project, applied the schema migration, verified tables and RLS.
- **Playwright MCP** + **Context7 MCP** — installed for browser checks and latest-docs lookups (Next.js 16, Supabase JS, shadcn/ui).

---

## Local setup

### Prerequisites

- Node.js 22 LTS
- pnpm 10+
- A Supabase project with **Email/Password** auth and the schema in `supabase/migrations/0001_initial.sql` applied.

### Steps

```bash
git clone https://github.com/xeneskus/p2p-payment-request-feature.git
cd p2p-payment-request-feature

pnpm install
cp .env.example .env.local
# Edit .env.local with NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# and SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard → Settings → API.

# Apply the schema. Two options:
# 1) Open Supabase Dashboard → SQL Editor and paste the contents of
#    supabase/migrations/0001_initial.sql.
# 2) From an agent with the Supabase MCP installed, run apply_migration with
#    the same file.

pnpm dev
# → http://localhost:3000
```

**Supabase Auth toggle:** turn OFF "Confirm email" under Authentication → Providers → Email so the test register flow does not block on a confirmation email.

---

## Running the tests

```bash
# Unit tests (Money + Zod schemas + lazy expiry)
pnpm test:unit
# → 36 tests, all passing

# Type check
pnpm typecheck

# End-to-end (Playwright with video recording)
pnpm test:e2e
# → playwright-report/<spec>/video.webm   (the screen recording artefact)
pnpm exec playwright show-report
```

---

## Project structure

```
.specify/memory/constitution.md          Project principles (non-negotiable)
.specify/templates/                      Spec-Kit templates
.claude/skills/speckit-*                 Eight /speckit-* skills

specs/001-p2p-payment-request/
├── spec.md                              5 user stories, 15 FR, 8 edge cases
├── plan.md                              Tech context + Constitution Check
├── research.md                          10 technical decisions w/ rationale
├── data-model.md                        Tables, RLS, state machine
├── contracts/api.md                     API surface + error codes
├── quickstart.md                        Developer onboarding
├── tasks.md                             50 atomic tasks across 8 phases
└── checklists/requirements.md           16/16 spec quality items passing

src/
├── app/
│   ├── (auth)/                          login, register
│   ├── (app)/                           protected: dashboard, requests/...
│   ├── pay/[token]/                     public shareable-link view
│   └── api/                             Route Handlers (auth, requests, public)
├── features/                            Domain modules (auth, requests)
├── lib/                                 Money, ApiError, expiry, Supabase clients
├── components/                          shadcn primitives + project components
└── middleware.ts                        Edge auth guard

tests/unit/                              Vitest specs
tests/e2e/                               Playwright specs (when added)

supabase/migrations/0001_initial.sql     profiles, payment_requests, RLS, indexes
```

---

## API surface

| Method | Path                                                      | Auth     | Purpose                                     |
| ------ | --------------------------------------------------------- | -------- | ------------------------------------------- |
| `POST` | `/api/requests`                                           | required | Create a request                            |
| `GET`  | `/api/requests?direction=outgoing\|incoming&status=…&q=…` | required | List with filters                           |
| `GET`  | `/api/requests/{id}`                                      | required | Get a single request (sender or recipient)  |
| `POST` | `/api/requests/{id}/pay`                                  | required | Recipient pays (2.5 s simulated settlement) |
| `POST` | `/api/requests/{id}/decline`                              | required | Recipient declines                          |
| `POST` | `/api/requests/{id}/cancel`                               | required | Sender cancels                              |
| `GET`  | `/api/public/{token}`                                     | public   | Read-only shareable-link view (redacted)    |

Full request/response shapes, error codes, and validation rules live in [`specs/001-p2p-payment-request/contracts/api.md`](./specs/001-p2p-payment-request/contracts/api.md).

---

## Cover note

See [`docs/cover-note.md`](./docs/cover-note.md) for the assignment's 2-3 paragraph reflection (most challenging part, how AI helped, key trade-offs).

---

## License

MIT.
