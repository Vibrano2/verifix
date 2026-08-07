# Verifix Backend Architecture

Applies the layered structure from the code review to the actual Verifix schema and endpoints already built (Days 1-4). This is the target architecture — use it to refactor `auth.ts` first, then apply the same pattern to jobs, matches, transactions, and admin as they're touched.

---

## 1. Layered flow

```
Route → Middleware (auth/validation) → Controller → Service → Repository → Firestore
```

- **Route**: maps HTTP method + path to a controller function. No logic.
- **Middleware**: auth checks, request validation, error handling. Runs before the controller.
- **Controller**: parses `req`, calls the service, shapes the HTTP response. No Firestore calls, no business rules.
- **Service**: business logic — commission calculation, matching rules, escrow state transitions, ownership checks. Calls repositories, never Firestore directly.
- **Repository**: the only layer that touches Firestore. One repository per collection.

Rule of thumb: if a function contains both an `if (ownerId !== req.user.uid)` check and a `.collection(...).doc(...)` call, it's in the wrong layer.

---

## 2. Folder structure

```
src/
├── config/            # Firebase admin init, Paystack client, env loading
├── constants/
│   ├── collections.ts # Firestore collection names
│   ├── roles.ts       # client/artisan
│   ├── statuses.ts    # job/match/transaction status enums
│   └── trades.ts       # locked 24-trade taxonomy + category mapping
├── controllers/
│   ├── auth.controller.ts
│   ├── artisan.controller.ts
│   ├── job.controller.ts
│   ├── match.controller.ts
│   ├── payment.controller.ts
│   └── admin.controller.ts
├── services/
│   ├── auth.service.ts
│   ├── artisan.service.ts
│   ├── job.service.ts
│   ├── matching.service.ts
│   ├── payment.service.ts        # Paystack calls, locked_job_value logic
│   ├── escrow.service.ts         # Mark Complete, commission calc
│   ├── rating.service.ts         # rating write + reputation_score recalc
│   └── admin.service.ts
├── repositories/
│   ├── user.repository.ts
│   ├── artisan.repository.ts
│   ├── job.repository.ts
│   ├── match.repository.ts
│   └── transaction.repository.ts
├── middlewares/
│   ├── authenticate.ts           # verifies Firebase ID token
│   ├── authorizeOwner.ts         # generic "does req.user own this resource" check
│   ├── authorizeAdmin.ts         # checks process.env.ADMIN_UID
│   ├── validate.ts               # runs a Zod schema against req.body
│   └── errorHandler.ts           # catches thrown errors, returns standard shape
├── validators/
│   ├── auth.validators.ts
│   ├── job.validators.ts
│   └── artisan.validators.ts
├── types/
│   ├── user.ts
│   ├── artisan.ts
│   ├── job.ts
│   ├── match.ts
│   └── transaction.ts
├── utils/
│   ├── logger.ts                 # wraps functions.logger
│   ├── response.ts               # success()/failure() helpers
│   └── webhookVerify.ts          # Paystack signature check
├── routes/
│   ├── v1/
│   │   ├── auth.routes.ts
│   │   ├── artisan.routes.ts
│   │   ├── job.routes.ts
│   │   ├── payment.routes.ts
│   │   └── admin.routes.ts
│   └── index.ts
└── index.ts
```

---

## 3. How this maps to what's already built

| Existing piece | Lives in |
|---|---|
| OTP send/verify (client/artisan) | `auth.service.ts` + `user.repository.ts` |
| Register, reset-password, reset-password/confirm (admin/dashboard) | `auth.service.ts`, using Firebase Auth's email/password provider directly rather than a custom repository — no plaintext password ever touches Firestore |
| Artisan signup, availability toggle (IDOR-protected) | `artisan.service.ts`, guarded by `authorizeOwner` middleware |
| Job posting + validation (trade/urgency/length) | `job.validators.ts` (Zod schema) + `job.service.ts` |
| Matching query + concentration fix | `matching.service.ts` — isolated so Data Science's spec changes don't touch controllers |
| Payment init, `locked_job_value` capture | `payment.service.ts` — this is where the value gets frozen onto the transaction, one place only |
| Webhook signature check | `utils/webhookVerify.ts`, called from `payment.controller.ts` before anything else runs |
| Contact-reveal payment gate | `escrow.service.ts` — checks `transaction.status === 'held'`, not just auth |
| Mark Complete (idempotent, commission calc) | `escrow.service.ts` — single function, checked for double-release before writing |
| Admin UID env-var check | `authorizeAdmin.ts` middleware, applied to admin routes only |
| Rating + reputation_score recalc | `rating.service.ts` — writes to `matches.rating`, recalculates `artisan_profiles.reputation_score` in the same service call so they can't drift apart |

---

## 4. Cross-cutting standards

**Response shape** (`utils/response.ts`), used by every controller:
```ts
success(data, message?) → { success: true, message, data }
failure(message)        → { success: false, message }
```
Internal error details never reach the response body — log via `logger.error()`, return a generic message.

**Collection/role/status/trade constants** — no magic strings anywhere outside `constants/`. This matters more for Verifix than most projects because the schema doc already locks specific enum values (`held`/`released`, `pending`/`accepted`/`declined`/`completed`, the 24-trade list) — those enums should be typed constants, not strings retyped in five files.

**Ownership checks** — one generic `authorizeOwner` middleware, parameterized by which repository to check, rather than a bespoke check per endpoint. The availability-toggle IDOR fix from Day 3 is the pattern; every future "artisan edits their own X" endpoint should reuse this middleware, not reimplement the check.

**Idempotency** — Mark Complete needs a guard at the top of `escrow.service.ts`: if the transaction is already `released`, return early rather than recalculating. Same pattern should apply anywhere else a state transition triggers money movement.

**Validation** — Zod schemas per route in `validators/`, applied via the `validate` middleware, so a bad request never reaches a controller.

**API versioning** — routes live under `/api/v1/`, per the improvement doc's recommendation, so Frontend's contract doesn't break silently on future changes.

**Dev-only routes** — anything like a custom-token endpoint gets wrapped in a `NODE_ENV === 'development'` check or isolated into its own dev-only route file that's never mounted in production.

---

## 5. What to build first

Given three backend devs already split by domain (Dev A: Identity, Dev B: Jobs & Matching, Dev C: Payments & Security), the refactor should follow the same ownership split so nobody's blocked on someone else's layer:

1. **Shared scaffolding first** (whoever's free): `constants/`, `types/`, `utils/response.ts`, `utils/logger.ts`, `middlewares/errorHandler.ts` — these are used by all three devs, so build once, share immediately.
2. **Dev A**: `user.repository.ts`, `artisan.repository.ts`, refactor `auth.ts` into the controller/service/repository split — this is the file the review was written against.
3. **Dev B**: `job.repository.ts`, `match.repository.ts`, `matching.service.ts`
4. **Dev C**: `transaction.repository.ts`, `payment.service.ts`, `escrow.service.ts` — highest-risk logic (money movement), so give it the most isolated, most tested service.

Repositories can be built in parallel since they don't depend on each other. Services depend on their own repository only. Controllers come last since they depend on services being stable.
