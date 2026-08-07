# Verifix PRD v1.1 vs. Actual Backend Build — Reconciliation

For the Backend Development review due Week 2, Day 1. Three categories: things that genuinely conflict and need a decision, things the PRD adds that aren't built yet, and things that are probably just PRD drafting inconsistencies worth a quick fix.

---

## 1. Real conflicts — need a team decision

### Ratings: separate collection vs. field on `matches`
**What's built:** `matches.rating` — a single numeric 1-5 value stored directly on the match document. No review text.

**What the PRD specifies (Section 7.4 + user story C-005):** A standalone `ratings` collection — `rating_id, job_id, artisan_uid, client_uid, score, review, created_at` — with a **text review field**, not just a numeric score.

This is a structural difference, not a naming nit. If the PRD's version is correct, it means:
- A new collection needs to be added to the schema
- The rating endpoint needs a `review` text field added to its request body
- The duplicate-rating check (currently keyed by match) needs to instead check the new `ratings` collection

**Recommend:** raise this explicitly at the Day 1 review — this is the kind of gap that's cheap to fix now and expensive once Frontend builds the rating UI against one shape or the other.

### Rating submission: separate endpoint vs. bundled into Mark Complete
**What's built:** `POST /api/jobs/:id/rating` — separate endpoint, called after Mark Complete.

**What the PRD's API spec shows (Section 9.3):** `POST /api/jobs/:id/complete` takes `{ rating: number, review?: string }` directly in the same request — rating and completion are one call, not two.

**Recommend:** confirm with PM/Frontend which flow the UI is actually built for (user story C-005 in the PRD implies "Mark Complete button triggers release; rating prompt appears immediately after" — which reads more like two steps, not one combined call, so the PRD's own narrative may contradict its own API table). Worth a direct question, not a silent pick.

### `locked_job_value` — which collection owns it
**What's built:** `transactions.locked_job_value`, captured at payment initialization.

**What the PRD's data table shows (Section 7.4):** lists `locked_job_value` under **`artisan_profiles`**, not `transactions`. This almost certainly a drafting error in the PRD — an artisan profile has no relationship to a single job's value, and the PRD's own Section 7.3 payment flow narrative describes it living on the transaction, matching what's built. Flag it as a likely typo for Gabriel to fix in the next PRD revision rather than something to rebuild around.

### Endpoint path/verb naming
Several endpoint paths differ between what's built and the PRD's Section 9 spec:

| Built | PRD spec |
|---|---|
| `POST /api/auth/send-otp` | `POST /api/auth/phone/send-otp` |
| `POST /api/auth/verify-otp` | `POST /api/auth/phone/verify-otp` |
| `POST /api/payments/initialize` | `POST /api/payments/initialise` |
| `POST /api/artisans/signup` | `POST /api/artisans` |

Cosmetic, but Frontend will build against whichever is documented as canonical. Worth aligning on one before more screens get wired up — recommend adopting the PRD's paths since it's now the source of truth document, and updating the build prompt/architecture docs to match.

---

## 2. PRD requirements not yet built

- **`analytics_events` collection** — not in the current schema at all. Needed for Data Analysis's dashboard (Section 8.8). Fields: `event_id, event_type, user_id, session_id, metadata, timestamp`.
- **OTP rate limiting** (Section 7.1) — 3 requests/hour per phone, 24-hour lockout after 5 failed attempts. Not mentioned in any Day 1-4 devlog; needs to be added to the auth service.
- **Priority score algorithm v1** (Section 7.2) — a specific weighted formula (`avg_rating × 0.40 + completed_jobs component × 0.30 + response_speed × 0.20 + verification_bonus × 0.10`) is now specified. What's been built so far is described more simply as "distance sort, then completed_jobs/reputation_score tiebreaker" — worth checking with Data Science whether the matching service needs to be updated to this exact formula, including a new `response_speed_score` input that doesn't exist in the schema yet.
- **7-day workmanship protection window** — mentioned in the payment/checkout screen copy and NFR table, but no expiry/dispute-window field exists on jobs or transactions yet. Section 16 (Open Questions #2) confirms this is still undecided even at the PM level, so no need to build it yet — just don't let it get lost.
- **Refund process on held-but-unresolved payment** — explicitly an open question in the PRD itself (Section 16, #1), owned jointly by Backend + PM, due Week 2 Day 1. This is on you to help answer, not just receive.
- **Admin analytics endpoint** — `GET /api/admin/analytics` returning `{ users, jobs, matches, revenue }` — not built yet.

## 3. Confirmed matches (already aligned, no action needed)
- IDOR protection pattern (ownership check before every mutation) — matches what Day 3 built
- Webhook signature verification — matches Day 2/3
- Server-side MIME validation on uploads — matches Day 3
- Admin access via env-var UID, not a role field — matches Day 4
- Commission calculated server-side from a locked value, not client input — matches Day 4's `locked_job_value` fix exactly

---

## Recommended next step
Bring items in Section 1 to the Week 2 Day 1 review as explicit decisions, not silent implementation choices — especially the ratings structure, since Frontend's screen 6 ("Job Complete + Rate") depends on knowing which shape to build against.
