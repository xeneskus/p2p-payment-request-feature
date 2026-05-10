# Data Model: P2P Payment Request

**Phase 1 of /speckit-plan output. Source-of-truth schema, migrations live at `supabase/migrations/0001_initial.sql`.**

## Tables

### `profiles`

A row per registered user, mirroring `auth.users` so we can join without crossing the auth schema.

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users.id` ON DELETE CASCADE |
| `email` | `text` | NOT NULL, UNIQUE, stored lowercase (citext-equivalent via trigger) |
| `display_name` | `text` | NULL allowed; falls back to email-local-part in UI |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

A trigger on `auth.users` after insert copies `(id, email)` into `profiles`.

### `payment_requests`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `from_user_id` | `uuid` | NOT NULL, FK → `profiles.id` |
| `to_email` | `text` | NOT NULL, stored lowercase |
| `amount_cents` | `integer` | NOT NULL, CHECK `> 0`, CHECK `<= 100_000_000` (one million USD upper bound) |
| `note` | `text` | NULL allowed, max 280 chars (CHECK `char_length(note) <= 280`) |
| `status` | `text` | NOT NULL, default `'pending'`, CHECK in (`'pending'`, `'paid'`, `'declined'`, `'cancelled'`, `'expired'`) |
| `shareable_token` | `uuid` | NOT NULL, UNIQUE, default `gen_random_uuid()` |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `expires_at` | `timestamptz` | NOT NULL, default `now() + interval '7 days'` |
| `paid_at` | `timestamptz` | NULL until `status = 'paid'` |
| `declined_at` | `timestamptz` | NULL until `status = 'declined'` |
| `cancelled_at` | `timestamptz` | NULL until `status = 'cancelled'` |

Additional CHECK: `to_email != (SELECT email FROM profiles WHERE id = from_user_id)` is enforced by a `BEFORE INSERT` trigger (not a CHECK constraint, since CHECK cannot reference other tables).

## State Machine

```
                ┌──────── pay ────────► paid
                │
   pending ─────┼─── decline ─────────► declined
                │
                ├─── cancel ──────────► cancelled
                │
                └─── (now > expires_at) ► expired   (computed at read time;
                                                     persisted lazily on first
                                                     read after expiry)
```

Terminal states never transition. All mutations run as:

```sql
UPDATE payment_requests
SET status = $next,
    {paid_at|declined_at|cancelled_at} = now()
WHERE id = $id
  AND status = 'pending'
  AND expires_at > now()
RETURNING *;
```

If `RETURNING` is empty, the API returns `409` with code `not_pending` (status conflict) or `410` with code `expired` (the row is past `expires_at`).

## Indexes

```sql
-- Dashboard outgoing query
CREATE INDEX payment_requests_from_status_idx
  ON payment_requests (from_user_id, status, created_at DESC);

-- Dashboard incoming query
CREATE INDEX payment_requests_to_status_idx
  ON payment_requests (to_email, status, created_at DESC);

-- Public shareable link lookup (already unique-indexed by the UNIQUE constraint)

-- Lazy-expiry scan (optional; used by the Cron-less reconciliation query)
CREATE INDEX payment_requests_pending_expiry_idx
  ON payment_requests (expires_at)
  WHERE status = 'pending';
```

## Row Level Security

```sql
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- Read: sender OR recipient (by email match)
CREATE POLICY payment_requests_select
  ON payment_requests
  FOR SELECT
  USING (
    auth.uid() = from_user_id
    OR lower(auth.email()) = to_email
  );

-- Writes are forbidden via the client SDK; the service-role client used by
-- Route Handlers bypasses RLS.
CREATE POLICY payment_requests_no_client_writes
  ON payment_requests
  FOR ALL
  USING (false)
  WITH CHECK (false);
```

`profiles` has a simpler policy: the row owner reads their own row; writes go through the trigger only.

## Lifecycle

1. **Create**: `INSERT` via service-role client from `/api/requests` handler. Returns the new row including `shareable_token`.
2. **List**: `SELECT` via the user's authenticated client; RLS reduces the visible rows automatically.
3. **Detail**: `SELECT` by `id`; RLS reduces; if no row returned the handler emits `404`.
4. **Pay/Decline/Cancel**: `UPDATE … WHERE status = 'pending' AND expires_at > now() RETURNING *` via service-role client; empty result → `409` or `410`.
5. **Public link**: `SELECT` by `shareable_token` via service-role client; redacts `to_email` and any other private field before returning.
6. **Expiry**: lazy. Reads compute `effective_status = status === 'pending' && expires_at < now() ? 'expired' : status`. The first read after expiry MAY persist `status = 'expired'` via a service-role `UPDATE`.

## Constraints summary

- Money: `amount_cents > 0` (CHECK), `<= 100_000_000` (CHECK).
- Identity: `to_email` lowercase, `from_user_id` references `profiles.id`.
- Self-request: trigger rejects `to_email == sender.email`.
- Status: enumerated CHECK; transitions guarded by the `WHERE status = 'pending'` precondition.
- Tokens: `shareable_token` is `gen_random_uuid()` (cryptographic) and UNIQUE.
