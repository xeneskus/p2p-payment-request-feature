# Cover Note — P2P Payment Request

**Author:** Enes Kuş
**Project:** Lovie First Interview Assignment — P2P Payment Request feature
**Repository:** https://github.com/xeneskus/p2p-payment-request-feature

## The most challenging part

The most challenging part was not "writing the feature"; it was **separating the _what_ from the _how_** rigorously enough that GitHub Spec-Kit's discipline could actually pay off. Spec-Kit's `/speckit-specify` refuses to acknowledge a tech stack — the spec must talk in pure user-and-rules terms — and `/speckit-plan` is the first step where you are allowed to say "Supabase" or "Next.js". My instinct, after years of just opening an editor and typing, was to mention frameworks in user-story language and to bury edge cases inside implementation files. Resisting that and producing a spec that would survive a swap of the entire stack was the hardest discipline. The payoff was concrete: when I sat down to implement, every decision was already made — the Constitution Check gate in `plan.md` had already locked in integer-cents, the `WHERE status = 'pending'` race-safe pattern, the standard error envelope — so the actual coding was almost mechanical, three hours of typing instead of three hours of thinking.

## How AI tools helped (and hindered)

AI helped most in two non-obvious ways. First, **the Supabase MCP** turned a normally-tedious dashboard chore — create project, copy URL, copy key, paste SQL, verify policies — into four tool calls that completed in under a minute, without leaving the terminal. The same MCP later answered "do I have a `payment_requests` table with RLS enabled?" by querying the live cluster, which is something I would otherwise have squinted at the dashboard for. Second, **Claude Code's task model paired with Spec-Kit's templates** meant the spec wasn't a single 1000-word blob — each user story has its own acceptance criteria, each requirement has a numbered ID, each edge case is one bullet — so refactoring the spec mid-implementation was a precise edit, not a rewrite. Where AI hindered: the first version of my plan had an idempotency-key endpoint and a per-user rate limiter that the assignment didn't ask for; I had to delete them deliberately. The lesson is that AI is good at producing more, and the engineering job is still to decide what _not_ to include.

## Key trade-offs

I made three trade-offs visibly. **Email + password instead of magic links** — the assignment says either is fine, and password registration is much friendlier to two-tab manual testing and to Playwright E2E than waiting on email round-trips. **Lazy expiry instead of a Cloud Function cron** — pending requests do not get pre-emptively transitioned to `expired` by a scheduler; every read and every mutation handler computes the effective status from `expires_at`. This keeps the deployment footprint to "one Next.js app + one Supabase project", which is what a four-hour prototype calls for. **No idempotency-key header** — a real payments product would have one to prevent double-charge on retry; the prototype relies on the database-level `UPDATE … WHERE status = 'pending' RETURNING` pattern, which is sufficient for the assignment scope but explicitly called out as v2 in the spec's Out-of-Scope notes.
