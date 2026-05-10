# Feature Specification: P2P Payment Request

**Feature Branch**: `001-p2p-payment-request`
**Created**: 2026-05-11
**Status**: Draft
**Input**: User description: "A peer-to-peer payment request feature for a consumer fintech app. A user signs in, types a friend's email address, an amount, and an optional note, and creates a payment request. The friend receives the request, opens it, and chooses to Pay (which simulates settlement), Decline, or ignore it; the sender can Cancel a pending request. Requests expire after seven days. A shareable link lets the recipient view a request without needing to be the same user — they can read the amount, the note, and the sender's name, and they sign in to act on it. The user has a dashboard with two tabs — Outgoing (requests they sent) and Incoming (requests they received) — with status filtering and search. Money is handled with precision (cents, never floats), validation runs on both client and server, and requests respect their state machine strictly (you cannot pay an expired or already-paid request)."

## User Scenarios & Testing

### User Story 1 - Send a payment request (Priority: P1)

A registered user wants their friend to repay $40 for concert tickets. They open the app, enter their friend's email address, the amount, and a one-line note, and submit. The request appears immediately in their Outgoing tab as Pending, and a shareable link is produced that they can copy and send via any external channel.

**Why this priority**: This is the primary value proposition of the feature. Without it, no other story applies. It is the smallest slice that gives the sender a usable artefact (the request and its link).

**Independent Test**: Sign in as a user, create a request to any email with any positive amount, confirm the new request appears in Outgoing with the entered amount, status `Pending`, and a non-empty shareable link.

**Acceptance Scenarios**:

1. **Given** the user is signed in and the form is empty, **When** they enter a valid email, an amount of `40.00`, and submit, **Then** a new request is created with status `Pending`, the entered amount, and a unique shareable link, and the user is shown a confirmation.
2. **Given** the user enters an amount of `0` or a negative number, **When** they submit, **Then** the request is not created and an inline error explains the constraint.
3. **Given** the user enters their own email address as recipient, **When** they submit, **Then** the request is not created and an error explains that self-requests are not allowed.
4. **Given** the user enters a malformed email address, **When** they submit, **Then** the request is not created and an error highlights the email field.

---

### User Story 2 - Pay an incoming request (Priority: P1)

A user receives a notification (or follows a shareable link) about a $40 request from a friend. They open the request, see the amount, note, and sender, and choose Pay. The system shows a brief loading state, confirms success, and the request moves to `Paid` in both the sender's and recipient's dashboards.

**Why this priority**: This is the other half of the core value proposition — the request must be redeemable, not just creatable. Together P1.1 and P1.2 form the minimum viable product.

**Independent Test**: Have a request addressed to the user in `Pending`. Open it, press Pay, wait for the success screen, confirm the request now reads `Paid` in both the recipient's Incoming list and the sender's Outgoing list.

**Acceptance Scenarios**:

1. **Given** the user is the recipient of a `Pending` request and is signed in, **When** they press Pay and confirm, **Then** the request transitions to `Paid`, a success screen is shown, and the new status is visible to both parties without manual refresh.
2. **Given** the request is already `Paid`, `Declined`, `Cancelled`, or `Expired`, **When** the user opens the detail page, **Then** the Pay button is not offered and the current status is shown instead.
3. **Given** two devices submit Pay for the same `Pending` request at the same moment, **When** both attempts are processed, **Then** exactly one is accepted and the other receives a clear "this request is no longer pending" response — no double-pay occurs.

---

### User Story 3 - Decline or cancel a request (Priority: P2)

The recipient of an unwanted request presses Decline, ending the request without paying. Symmetrically, the sender of a request they no longer want to pursue presses Cancel. In both cases the request becomes terminal, no further actions are possible, and the change is visible to the other party.

**Why this priority**: Important for closing the loop and giving each party agency over the request, but the feature is still useful without it (recipients can ignore; senders can wait for expiry). Hence P2.

**Independent Test**: With a `Pending` request, exercise Decline as the recipient and verify status `Declined`; with a different `Pending` request, exercise Cancel as the sender and verify status `Cancelled`. Neither offers further actions afterwards.

**Acceptance Scenarios**:

1. **Given** the user is the recipient of a `Pending` request, **When** they press Decline and confirm, **Then** the request transitions to `Declined` and is no longer actionable.
2. **Given** the user is the sender of a `Pending` request, **When** they press Cancel and confirm, **Then** the request transitions to `Cancelled` and is no longer actionable.
3. **Given** a request has already left `Pending`, **When** either party attempts Decline or Cancel, **Then** the action is refused with a status-aware message.

---

### User Story 4 - Browse and search the dashboard (Priority: P2)

A user wants to find a specific past request among many. They open the dashboard, switch between Outgoing and Incoming tabs, narrow by status, and type a recipient or sender's email fragment in the search box. Matching results appear immediately.

**Why this priority**: Quality-of-life feature that becomes important once a user has more than a handful of requests; the core flows work without it.

**Independent Test**: Seed several requests across statuses and recipients, switch tabs, apply a status filter, type part of an email, and confirm only the matching subset is shown.

**Acceptance Scenarios**:

1. **Given** the user is on the dashboard, **When** they switch to Incoming, **Then** the list shows only requests where they are the recipient.
2. **Given** the user filters by `Paid`, **When** the list updates, **Then** only `Paid` requests remain visible.
3. **Given** the user types `alex` in the search box, **When** the list updates, **Then** only requests where the counterparty's email contains `alex` are visible.

---

### User Story 5 - Open a request via shareable link (Priority: P3)

A recipient who has not signed in yet clicks the shareable link the sender sent them. They see a read-only page with the amount, the note, and the sender's display name, and a call to action to sign in or register to act on it.

**Why this priority**: Adds reach (the sender can share the link before the recipient has an account) but the feature is functional via email-based recipient lookup alone, so it is P3.

**Independent Test**: Open the shareable link in a private browser window. The amount, note, and sender's display name are visible. The page does not expose the recipient's email or any other private field, and prompts the visitor to sign in to continue.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor opens a valid shareable link for a `Pending` request, **When** the page renders, **Then** the amount, note, sender display name, and status are visible; the recipient email and any sensitive details are not.
2. **Given** the visitor follows the link but the request has been `Cancelled`, `Declined`, `Paid`, or `Expired`, **When** the page renders, **Then** the page shows the terminal status and offers no action.
3. **Given** the visitor follows a link whose token does not match any request, **When** the page renders, **Then** the page shows a "not found" state.

---

### Edge Cases

- A user submits the request form twice rapidly (e.g., double-click). The second submission either produces one extra request or is rejected; either outcome MUST be documented and deterministic — not a silent partial save.
- The user types an email whose casing differs from the recipient's stored address (e.g., `User@Foo.com` vs `user@foo.com`). The system MUST treat these as the same recipient.
- A recipient receives a request before they have an account, then registers later with the same email. After signing in, the request MUST appear in their Incoming list.
- The system clock skews between client and server near the seven-day boundary. The server's clock is authoritative for expiry decisions; the client MAY display a slightly stale countdown.
- A user opens the dashboard and a status change happens server-side (e.g., a Pay just succeeded). The list MUST reflect the new status within seconds, without requiring a manual refresh.
- A request's note contains characters that look like HTML or script tags. The note MUST be rendered as plain text under all circumstances.
- A user navigates back in the browser after paying. The detail page MUST NOT offer the Pay button again; the status is the source of truth.
- A shareable link is correct but the recipient is not the intended one (e.g., the sender shared the wrong link). Reading is allowed; acting (Pay/Decline) is allowed only after sign-in and only by the recipient identified on the request.

## Requirements

### Functional Requirements

- **FR-001**: Users MUST be able to register and sign in using an email address and a password.
- **FR-002**: A signed-in user MUST be able to create a payment request by supplying a recipient email, a positive monetary amount, and an optional short note.
- **FR-003**: The system MUST reject any amount that is not a positive value within a defined upper bound (e.g., one million units of the currency).
- **FR-004**: The system MUST reject any malformed email and any request where the recipient address matches the sender's address.
- **FR-005**: The system MUST generate a unique, unguessable shareable token for every request at creation time and expose it as part of the request URL.
- **FR-006**: A signed-in user MUST be able to view their requests split into two lists: those they sent (Outgoing) and those addressed to them (Incoming).
- **FR-007**: Each list MUST be filterable by status (`Pending`, `Paid`, `Declined`, `Cancelled`, `Expired`) and searchable by the counterparty's email or display name (case-insensitive substring).
- **FR-008**: A recipient MUST be able to transition a `Pending` request to `Paid` via a confirmed Pay action; the transition MUST show progress feedback for two to three seconds and then a clear success state.
- **FR-009**: A recipient MUST be able to transition a `Pending` request to `Declined` via a confirmed Decline action.
- **FR-010**: A sender MUST be able to transition a `Pending` request to `Cancelled` via a confirmed Cancel action.
- **FR-011**: The system MUST treat any `Pending` request as `Expired` from the start of the eighth day after creation; an expired request MUST NOT be payable, declinable, or cancellable.
- **FR-012**: Status transitions MUST be one-way: terminal states (`Paid`, `Declined`, `Cancelled`, `Expired`) MUST NOT change, and concurrent attempts to leave `Pending` MUST yield exactly one successful transition.
- **FR-013**: When a request's status changes, both parties' dashboards MUST reflect the new status within a few seconds without a manual page reload.
- **FR-014**: The shareable link MUST display the amount, note, sender display name, and current status to an unauthenticated visitor, and MUST NOT display the recipient's email or any other private detail.
- **FR-015**: Monetary amounts MUST be stored, transported, and computed without fractional drift; the displayed dollar value MUST equal the stored value exactly.

### Key Entities

- **User**: A person who can sign in. Holds an email address (unique, case-insensitive), a display name, and the credentials necessary for authentication.
- **Payment Request**: A money request from one user to another. Holds the sender reference, the recipient email, the amount (in the smallest currency unit), an optional note, the current status, a shareable token, the creation timestamp, and the expiry timestamp.
- **Status**: A finite, ordered set — `Pending` (initial) → one of `Paid`, `Declined`, `Cancelled`, `Expired` (terminal). No transitions out of terminal states.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A signed-in user can complete the create-request flow (open form → fill in → submit → see confirmation) in under thirty seconds, on either a phone or a desktop browser.
- **SC-002**: Once a recipient pays a request, the sender sees the new `Paid` status in their Outgoing list within five seconds and without taking any manual refresh action.
- **SC-003**: Across one hundred simulated concurrent Pay attempts on the same `Pending` request, exactly one succeeds and ninety-nine receive a non-ambiguous "no longer pending" response — no request is paid twice.
- **SC-004**: Every expired request is non-actionable in the UI and at the API surface; a user attempting Pay on an expired request always sees a "request expired" message rather than a generic error.
- **SC-005**: A user with twenty or more historical requests can locate a specific request by searching for a fragment of the counterparty's email and applying a status filter in under ten seconds.

## Assumptions

- Email + password is the only supported authentication method for v1; magic links, single sign-on, and multi-factor authentication are deferred.
- The recipient is identified by email address only; SMS / phone-number recipients are deferred to a later version.
- Funds movement is simulated end-to-end; no real card, bank, or wallet integration occurs, and the prototype is not subject to KYC requirements.
- The product operates in a single currency (US dollars); multi-currency support is deferred.
- Expiry is a hard seven days from creation; configurable expiry per request and grace periods are deferred.
- The recipient may exist as a registered user at the time of request creation or may register later; the request remains valid in either case for the seven-day window.
