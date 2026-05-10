# Quickstart: P2P Payment Request

**Phase 1 of /speckit-plan output. Local-development walkthrough — a fresh clone to a running app in under ten minutes.**

## Prerequisites

- Node.js 22 LTS (`node -v` → `v22.x`)
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- A Supabase project (free tier is fine). Email auth enabled, "Confirm email" toggle OFF for testing.

## Setup

```bash
git clone <repo-url>
cd "p2p-payment-request-feature"

# Install deps
pnpm install

# Copy env template and fill in three values
cp .env.example .env.local
# Edit .env.local:
#   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
#   SUPABASE_SERVICE_ROLE_KEY=<service role key>

# Apply database migrations to your Supabase project
pnpm supabase:migrate     # alias for `psql $SUPABASE_DB_URL -f supabase/migrations/0001_initial.sql`
# Or run the SQL via the Supabase MCP `apply_migration` tool if you are using
# this project from a coding agent that has the Supabase MCP installed.

# Run the dev server
pnpm dev                  # opens http://localhost:3000
```

## Smoke test (manual)

1. Visit `http://localhost:3000` → redirected to `/login`.
2. Register two accounts in separate browser windows (or one private window):
   - `alice@example.test`
   - `bob@example.test`
3. As Alice, open `/requests/new`. Fill in `bob@example.test`, `40.00`, "Concert tickets". Submit.
4. The Outgoing tab on Alice's dashboard shows the new request, status `Pending`, with a shareable link button.
5. As Bob (the other window), refresh `/dashboard` → the Incoming tab shows Alice's request, also `Pending`.
6. Bob clicks the row → detail page → presses Pay → confirms.
7. After ~2.5 s a success screen appears.
8. Switch to Alice's window — without refreshing — the request flips to `Paid` within ~2 s via the Realtime channel.

## Run the test suite

```bash
# Unit (Vitest)
pnpm test:unit

# End-to-end (Playwright) — produces a .webm per spec under playwright-report/
pnpm test:e2e

# View the Playwright HTML report (videos embedded)
pnpm exec playwright show-report
```

## Deploy

1. Push the repo to GitHub.
2. Import the repo into Vercel, set the same three env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Vercel auto-detects Next.js; no build override needed.
4. Add the Vercel preview/production URL to Supabase → Auth → URL configuration → "Site URL" and "Redirect URLs".

## Troubleshooting

- **`401 unauthenticated` on every API call**: cookies are not being sent. Ensure your fetches are same-origin and the dev server URL matches `NEXT_PUBLIC_SUPABASE_URL`'s allowed origins in Supabase Auth settings.
- **Realtime channel never fires**: check Supabase → Project Settings → Realtime → "Postgres changes" is enabled for the `payment_requests` table.
- **Playwright tests time out at sign-in**: confirm "Confirm email" is OFF in Supabase Auth, otherwise registration emails block test progress.
