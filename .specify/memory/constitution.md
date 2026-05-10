<!--
SYNC IMPACT REPORT
==================
Version change: (initial) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles (5 principles)
  - Money Handling & Security Requirements
  - Development Workflow & Quality Gates
  - Governance
Removed sections: none
Templates requiring updates:
  - .specify/templates/plan-template.md           ✅ aligned (Constitution Check gate inherits all 5 principles)
  - .specify/templates/spec-template.md           ✅ aligned (specs remain technology-agnostic; principles enforced at /speckit-plan)
  - .specify/templates/tasks-template.md          ✅ aligned (Test-First and Integration-First reflected in task ordering)
  - .specify/templates/checklist-template.md      ✅ aligned (no constitution-specific items required)
Follow-up TODOs: none
-->

# PayRequest Constitution

This document records the non-negotiable engineering principles for the PayRequest peer-to-peer payment-request feature. Every specification, plan, task, and pull request MUST comply. Deviations require an explicit amendment recorded in this file.

## Core Principles

### I. Test-First (NON-NEGOTIABLE)
Every behavioural change MUST be expressed as a failing automated test before any production code is written. Acceptance scenarios from the specification become end-to-end tests (Playwright); domain rules become unit tests. Tests MUST be reviewed and confirmed to fail before implementation begins, and the Red → Green → Refactor cycle MUST be observed. Rationale: a payments feature with weak test coverage cannot be trusted; tests are the executable contract between spec and code.

### II. Money is Integer Cents (NON-NEGOTIABLE)
Monetary amounts MUST be represented as positive integers denominated in the smallest currency unit (USD cents). Floating-point types are forbidden anywhere a monetary value is stored, transported, computed, or compared. A single `Money` helper is the only place dollar-to-cent conversion may occur, and it MUST reject non-integer, negative, or out-of-range inputs at construction time. Rationale: floats silently lose precision under arithmetic; in a request-and-pay flow a one-cent drift is a defect, not a rounding error.

### III. Defense in Depth for Inputs and Access
Inputs MUST be validated on the client (for UX) and re-validated on the server (for trust). Database access MUST be gated by Row Level Security (RLS) policies that match the API-layer authorisation; the server SHOULD NOT be the sole protection. Every mutation MUST re-derive the actor identity from the verified session, never from a client-supplied identifier. Rationale: a bypassed UI, a stolen session, and a leaked service token are independent failure modes, each of which must be survived.

### IV. Race-Safe State Transitions (NON-NEGOTIABLE)
A payment request status MUST transition only through a guarded operation that asserts the prior state in the same statement that writes the new state (`UPDATE … WHERE status = 'pending' RETURNING …` or equivalent transaction). Two concurrent `pay` calls on the same request MUST produce exactly one success and one well-typed conflict response. Terminal states (`paid`, `declined`, `cancelled`, `expired`) MUST NOT transition further. Rationale: in a payments flow the absence of a `WHERE` precondition is the difference between idempotent and double-spend.

### V. Standard Error Envelope and HTTP Discipline
API responses MUST use a single, documented error envelope with a stable error code and a human-readable message. Status codes MUST follow the standard contract: `400` for malformed input, `401` for missing auth, `403` for authorised-but-forbidden, `404` for not-found, `409` for state conflict, `410` for expired/gone, `500` only for genuine server faults. Errors MUST be inspectable from a screenshot of the network tab — no opaque "500: error" responses. Rationale: predictable error semantics are the cheapest way to make the system testable and the integrators happy.

## Money Handling & Security Requirements

- Storage: `amount_cents INTEGER NOT NULL CHECK (amount_cents > 0)` in the database. No nullable monetary columns, no `numeric(10,2)`.
- Transport: all API request and response bodies carry cents as integers. Dollar formatting is a presentation concern handled exclusively at the UI boundary.
- Authentication: email + password authentication is sufficient for the prototype scope; magic links are explicitly out of scope to keep test feedback loops fast. Sessions MUST be HttpOnly cookies; bearer tokens are not exposed to client JavaScript.
- Authorisation: every Row Level Security policy MUST express the sender/recipient relationship in SQL (e.g. `auth.uid() = from_user_id OR auth.email() = to_email`). API handlers MUST re-check the same predicate before performing any mutation.
- Secrets: all credentials live in `.env.local` (development) or the deployment platform's encrypted store (production). `.env*` is ignored by git. Service-role keys MUST NOT appear in any client bundle.
- Expiry: requests expire seven days after creation; expired requests MUST NOT be paid, declined, or cancelled. Expiry is computed at read time from `created_at`; an `expired` status MAY be persisted lazily on the first read after expiry.

## Development Workflow & Quality Gates

- Spec-driven: every feature begins with `/speckit-specify`, proceeds through `/speckit-plan` and `/speckit-tasks`, and is executed under `/speckit-implement`. Source code MUST NOT precede the specification.
- Commit hygiene: commits MUST follow Conventional Commits (`chore:`, `feat:`, `fix:`, `docs:`, `test:`, `refactor:`). Each commit MUST be self-contained and pass type-checking and tests.
- Test coverage: unit tests for the `Money` helper, Zod schemas, and authorisation predicates; end-to-end Playwright tests for the five user-visible flows (auth, create, dashboard, pay, expiration). Playwright runs MUST record `video: 'on'`, `screenshot: 'on'`, and `trace: 'on'` so the recording is itself the deliverable.
- Code style: TypeScript strict mode; the `any` type is forbidden in production code. Tailwind utility classes for styling; shadcn/ui primitives for interactive components. No inline `style=` attributes.
- Pull requests: every PR description MUST reference the specification ID it implements and list the principles it touched. Reviewers MUST refuse to merge PRs that introduce floating-point money, bypass RLS, or skip the failing-test step.

## Governance

This constitution supersedes any conflicting convention, README note, or AI-generated suggestion. Amendments require: (a) an updated version line below per semantic-versioning rules — MAJOR for backward-incompatible principle changes, MINOR for new principles or materially expanded guidance, PATCH for clarifications; (b) a Sync Impact Report at the top of this file noting affected templates; and (c) propagation of any new constraints into the dependent templates under `.specify/templates/`. Compliance with this constitution is verified during `/speckit-plan` via the Constitution Check gate and during code review.

**Version**: 1.0.0 | **Ratified**: 2026-05-11 | **Last Amended**: 2026-05-11
