# Build Prompt: Verifix — Artisan Marketplace Backend (Firebase + Paystack)

## Context
Build the backend for a marketplace app connecting clients to local artisans (electricians, plumbers, etc.) in Nigeria. Clients post jobs, get matched to available artisans, pay a small match fee to reveal contact details, and pay the artisan directly for the work. The platform retains a 10% commission on job value, released from escrow when the client confirms the job is complete.

Stack: Firebase (Firestore + Auth + Storage), Paystack for payments, Node.js/Express (or Cloud Functions) for the API layer.

---

## 1. Firestore Schema

Create these 5 collections exactly as specified. Field names must match exactly — other services (matching algorithm, frontend, analytics) depend on these names.

### `users`
| Field | Type | Notes |
|---|---|---|
| uid | string | Firebase Auth UID, doc ID |
| first_name | string | |
| last_name | string | |
| phone | string | OTP-verified |
| role | string | `client` \| `artisan` |
| created_at | timestamp | |
| updated_at | timestamp | set on any profile edit |

### `artisan_profiles`
| Field | Type | Notes |
|---|---|---|
| uid | string | matches users.uid, doc ID |
| trade | string | one of the locked trade values (see below) |
| category | string | one of the 6 category groups, derived from trade |
| location | string | district-level |
| available | boolean | |
| verified | boolean | defaults `false` |
| id_document_url | string | |
| work_photos | array<string> | |
| completed_jobs | number | starts at 0 |
| reputation_score | number \| null | starts null, average of all ratings, recalculated on each new rating |
| tagline | string | ~100 char free text bio |
| updated_at | timestamp | |

**Locked trade enum** (validate server-side, reject anything outside this list):
- Home Maintenance & Repair: Electricians, Plumbers, Carpenters, AC technicians, Generator repairers, Borehole repair technicians, Welders, Tilers, PoP, Aluminium fabricators
- Vehicle: Mechanics
- Home Services: Home cleaners, Laundry services, Movers, Gardeners, CCTV installers
- Personal Care: Barbers, Hairdressers, Makeup artists, Tailors
- Professional/Care: Tutors, Nurses, Caregivers
- Events: Event photographers, Painters

### `jobs`
| Field | Type | Notes |
|---|---|---|
| job_id | string | doc ID |
| client_uid | string | fk → users.uid |
| trade | string | one of the locked trade values |
| location | string | |
| urgency | string | `Today` \| `This Week` \| `Flexible` — locked enum |
| budget | number \| null | rough client estimate |
| description | string | free text |
| match_fee | number | fee to hold a match, e.g. ₦500 — stored per-job, not hardcoded |
| status | string | `open` \| `matched` \| `complete` \| `cancelled` |
| created_at | timestamp | |
| updated_at | timestamp | |

### `matches`
| Field | Type | Notes |
|---|---|---|
| match_id | string | doc ID |
| job_id | string | fk → jobs.job_id |
| artisan_uid | string | fk → artisan_profiles.uid |
| status | string | `pending` \| `accepted` \| `declined` \| `completed` |
| rating | number \| null | 1-5, one per match |
| created_at | timestamp | |
| updated_at | timestamp | |

### `transactions`
| Field | Type | Notes |
|---|---|---|
| transaction_id | string | doc ID |
| match_id | string | fk → matches.match_id |
| artisan_uid | string | fk → artisan_profiles.uid, denormalized |
| amount | number | |
| status | string | `held` \| `released` |
| paystack_reference | string | |
| locked_job_value | number | job value captured at payment initiation — immutable, commission always calculated against this, never the live jobs document |
| commission_retained | number | locked_job_value × 0.10 |
| released_at | timestamp \| null | |
| created_at | timestamp | |

---

## 2. Endpoints to build

**Auth (client/artisan — phone-based)**
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`

**Auth (admin/dashboard — email + password)**

*Assumption: register and password reset imply a separate login path for internal/admin users, since the client/artisan schema has no password field and is phone-OTP only. Flag if this is meant for clients/artisans instead — that would require adding a password field to `users` and rethinking the phone-OTP flow.*
- `POST /api/auth/register` — creates an admin/dashboard user with email + hashed password (Firebase Auth email/password provider, not Firestore-stored plaintext)
- `POST /api/auth/reset-password` — accepts an email, sends a reset link/token via Firebase Auth's built-in reset flow. Does not reveal whether the email exists (return the same success response either way, to avoid leaking which emails are registered)
- `POST /api/auth/reset-password/confirm` — accepts the reset token + new password, updates credentials

**Artisan**
- `POST /api/artisans/signup` — creates artisan_profiles doc, `verified` defaults false
- `PATCH /api/artisans/:uid/availability` — toggle `available`. Must verify the authenticated user's UID matches the profile being updated (403 if not — this is an ownership check, not just an auth check)
- `POST /api/artisans/:uid/photo` — validate actual file MIME type/signature server-side (JPEG/PNG/WebP only), not just the file extension or client-declared type

**Jobs**
- `POST /api/jobs` — validate: trade is non-empty and in the locked enum, location has a reasonable max length, urgency is one of the 3 locked values. Reject with 400 and a clear message on any violation.
- Matching query: filter by trade + available, sort by distance, then completed_jobs/reputation_score as tiebreakers

**Payments**
- `POST /api/payments/initialize` — Paystack sandbox integration. At this moment, write `locked_job_value` onto the transaction (copy the job's current value — this becomes immutable and is what commission is calculated against later, regardless of any subsequent edits to the job)
- `POST /api/payments/webhook` — Paystack webhook receiver. Must verify Paystack's webhook signature before trusting the payload — do not process unsigned or invalid-signature requests. Updates transaction status to `held`.
- `POST /api/jobs/:id/reveal-contact` (WhatsApp/phone reveal) — must check that a transaction exists for the related match with `status = "held"` before returning any contact info. Checking authentication alone is not sufficient — this must be a payment-status gate.

**Mark Complete (escrow release)**
- `POST /api/jobs/:id/complete`
- Verify the requesting user is the client who posted the job (not the artisan, not any other authenticated user)
- Update job status to `complete`
- Commission = `locked_job_value × 0.10` (never recalculate from a live/current job value)
- Update transaction: `status → released`, `commission_retained` = calculated amount, `released_at` = now
- Handle edge cases explicitly: job value of zero, fractional kobo in commission calc, and calling this endpoint twice on the same job (should not double-release)

**Ratings**
- `POST /api/jobs/:id/rating` — authenticated client only, value must be 1-5. Check whether a rating already exists for this match before writing — return 409 Conflict if one does, do not overwrite. On success, recalculate `reputation_score` on the artisan_profiles doc as the average of all ratings across their completed jobs.

**Admin**
- `GET /api/admin/verification-queue` — list artisans with `verified = false`
- `POST /api/admin/verify/:uid` — set `verified = true`
- Both endpoints must only respond to a pre-defined admin UID read from an environment variable (`process.env.ADMIN_UID`) — never hardcoded in source. Confirm this value is not committed anywhere in git history.

**Dashboard data**
- `GET /api/artisans/:uid/dashboard` — query transactions by `artisan_uid`, return sum of `held` and sum of `released` separately so the frontend doesn't need to do math client-side

---

## 3. Security requirements (non-negotiable, not optional hardening)

1. Every write endpoint that modifies a resource tied to a specific user must verify the authenticated user owns that resource (IDOR protection) — do not rely on client-supplied IDs alone.
2. Webhook endpoint must verify Paystack's signature on every request.
3. File uploads must be validated by actual content/signature, not extension or declared MIME type.
4. Contact-reveal endpoint must check payment status (`held` transaction), not just authentication.
5. Admin endpoints must check against an env-var-stored UID, never a hardcoded value.
6. `.env` must be in `.gitignore` from the first commit. Never commit Paystack live keys — use test/sandbox keys during development.
7. Mark Complete must be idempotent — calling it twice on the same job must not double-release funds.

---

## 4. Out of scope — do not build these yet
- Admin roles beyond the single verification-approval action
- Dispute resolution flow
- Referral tracking
- Multi-trade artisans (schema is single-trade for now)

## 5. Known open items (flag back to the team if you hit these, do not silently decide)
- Whether `artisan_profiles` should become a subcollection of `users` (currently siblings linked by uid — costs an extra read per job-detail view)
- Whether `matches` needs a `declined_reason` field
- Whether artisan push/SMS notification support is in scope
- Whether `users.email` is needed (currently phone-only)
