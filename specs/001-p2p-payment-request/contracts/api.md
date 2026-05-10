# API Contract: P2P Payment Request

**Phase 1 of /speckit-plan output. Source-of-truth API surface; each endpoint maps to a Route Handler under `src/app/api/`.**

All endpoints exchange JSON. All responses use the standard error envelope:

```json
{ "error": { "code": "string", "message": "human-readable" } }
```

Status codes follow the constitution: `400` bad input, `401` missing/expired session, `403` authorised-but-forbidden, `404` not found, `409` state conflict, `410` expired, `500` unexpected fault only.

---

## POST /api/auth/session — Sign in

**Auth**: none required.

**Request**:

```json
{ "email": "alex@example.com", "password": "•••••••••" }
```

**Response 200**:

```json
{ "user": { "id": "uuid", "email": "alex@example.com" } }
```

Sets an HttpOnly session cookie. Errors: `400 invalid_credentials_format`, `401 invalid_credentials`.

## DELETE /api/auth/session — Sign out

**Auth**: any signed-in user.
Clears the session cookie. Always returns `204` on a valid call.

---

## POST /api/requests — Create a payment request

**Auth**: required.

**Request**:

```json
{
  "toEmail": "blair@example.com",
  "amountCents": 4000,
  "note": "Concert tickets"
}
```

**Validation** (Zod, shared client+server):
- `toEmail`: trimmed, lowercased, RFC 5322-style email regex.
- `amountCents`: integer, `> 0`, `<= 100_000_000`.
- `note`: optional, `<= 280` chars, plain text (rendered escaped in the UI).
- Server-only check: `toEmail !== currentUser.email` → `400 self_request`.

**Response 201**:

```json
{
  "request": {
    "id": "uuid",
    "fromUserId": "uuid",
    "toEmail": "blair@example.com",
    "amountCents": 4000,
    "note": "Concert tickets",
    "status": "pending",
    "shareableToken": "uuid",
    "createdAt": "2026-05-11T12:34:56Z",
    "expiresAt": "2026-05-18T12:34:56Z"
  }
}
```

Errors: `400 invalid_body`, `400 self_request`, `401 unauthenticated`.

---

## GET /api/requests — List requests

**Auth**: required.

**Query params**:
- `direction=outgoing|incoming` (required) — outgoing matches `from_user_id = auth.uid`; incoming matches `to_email = auth.email`.
- `status=pending|paid|declined|cancelled|expired` (optional) — exact match. Omitted means all.
- `q=string` (optional) — case-insensitive substring on the counterparty's email or display name.

**Response 200**:

```json
{
  "requests": [ /* PaymentRequest items, newest first */ ]
}
```

Errors: `400 invalid_query`, `401 unauthenticated`.

---

## GET /api/requests/:id — Get a single request

**Auth**: required. Returns `404` if the row is not visible to the caller (RLS).

**Response 200**:

```json
{ "request": { /* PaymentRequest */ } }
```

The `status` field reflects lazy expiry: a `pending` row whose `expires_at` is past is reported as `expired`.

---

## POST /api/requests/:id/pay — Pay an incoming request

**Auth**: required. Caller MUST be the recipient (`lower(auth.email()) = to_email`).

**Request body**: empty `{}` (no fields required for the simulated settlement).

**Server behaviour**:
1. Verify session, derive `email = auth.email()`.
2. Run `UPDATE payment_requests SET status='paid', paid_at=now() WHERE id=$id AND status='pending' AND expires_at > now() AND lower(to_email)=$email RETURNING *`.
3. If `RETURNING` is empty:
   - Row exists but expired → `410 expired`.
   - Row exists but not pending → `409 not_pending`.
   - Row exists but recipient mismatch → `403 forbidden`.
   - Row absent → `404 not_found`.
4. Otherwise return the updated row with status `paid`.
5. A two-to-three-second simulated processing delay (`await new Promise(r => setTimeout(r, 2500))`) is inserted **before** the `UPDATE` so the user sees a loading state while the response is in flight.

**Response 200**:

```json
{ "request": { /* PaymentRequest with status: paid, paid_at set */ } }
```

---

## POST /api/requests/:id/decline — Decline an incoming request

**Auth**: required. Caller MUST be the recipient. Semantics identical to `/pay` except the next state is `declined` and there is no simulated delay.

Errors: `403 forbidden`, `404 not_found`, `409 not_pending`, `410 expired`.

---

## POST /api/requests/:id/cancel — Cancel an outgoing request

**Auth**: required. Caller MUST be the sender (`auth.uid() = from_user_id`). Otherwise identical to `/decline`.

Errors: `403 forbidden`, `404 not_found`, `409 not_pending`, `410 expired`.

---

## GET /api/public/:token — Public shareable-link view

**Auth**: not required.

Returns a redacted view of the request keyed by `shareable_token`:

**Response 200**:

```json
{
  "request": {
    "amountCents": 4000,
    "note": "Concert tickets",
    "senderDisplayName": "Alex",
    "status": "pending",
    "expiresAt": "2026-05-18T12:34:56Z"
  }
}
```

`to_email`, `id`, `from_user_id`, and `shareable_token` are omitted. Errors: `404 not_found` for an unknown token.

---

## PaymentRequest schema (referenced above)

```ts
type PaymentRequest = {
  id: string;
  fromUserId: string;
  toEmail: string;
  amountCents: number;
  note: string | null;
  status: 'pending' | 'paid' | 'declined' | 'cancelled' | 'expired';
  shareableToken: string;
  createdAt: string;   // ISO 8601
  expiresAt: string;   // ISO 8601
  paidAt: string | null;
  declinedAt: string | null;
  cancelledAt: string | null;
};
```

Defined once as a Zod schema in `src/features/requests/schema.ts` and consumed by both the client (form validation) and the server (request-body parsing).
