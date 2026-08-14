# Artiva API Contract — Frontend Reference

Every endpoint Frontend needs to call, with request/response shapes and auth requirements. Backend owns implementation details (security checks, validation internals); this doc only covers what Frontend sends and gets back.

**Base path:** `/api` (confirm final base URL with Backend once deployed)
**Auth header:** `Authorization: Bearer <firebase_id_token>` on every authenticated request

---

## Auth (client/artisan — phone-based)

### `POST /auth/send-otp`
Request: `{ phone: string }`
Response: `{ success: boolean, message: string }`

### `POST /auth/verify-otp`
Request: `{ phone: string, otp: string }`
Response: `{ token: string, user: User }`
No auth header required (this call establishes the session).

---

## Auth (admin/dashboard only — separate from client/artisan flow)

Not used by the main client/artisan app. Only relevant if you're also building the admin dashboard.

### `POST /auth/register`
Request: `{ email: string, password: string }`

### `POST /auth/reset-password`
Request: `{ email: string }`

### `POST /auth/reset-password/confirm`
Request: `{ token: string, newPassword: string }`

---

## Artisan

### `POST /artisans/signup`
Requires auth (post phone-OTP verification).
Request:
```
{
  first_name: string,
  last_name: string,
  trade: string,          // must be one of the locked trade values
  location: string,
  services: string[],     // at least 1 required, from the locked list for the chosen trade
  nin: string,             // required
  id_document_url: string,
  work_photos: string[]
}
```
Response: `{ artisanId: string }`

Note: `nin` is write-only from the client's perspective — it will never be returned in any GET response, including the artisan's own profile fetch.

### `PATCH /artisans/:uid/availability`
Requires auth. Only the artisan themselves can call this for their own `uid` — a 403 comes back otherwise.
Request: `{ available: boolean }`
Response: `{ success: boolean }`

### `POST /artisans/:uid/photo`
Requires auth, multipart/form-data upload. JPEG/PNG/WebP only — non-image files are rejected server-side regardless of extension.
Response: `{ url: string }`

### `GET /artisans`
Optional auth. Query params: `trade`, `location`, `available`
Response: `ArtisanProfile[]` (public fields only — no `nin`, no `id_document_url`)

### `GET /artisans/:id`
Response: `ArtisanProfile` (same field restriction as above)

### `GET /artisans/:uid/dashboard`
Requires auth, artisan only, own dashboard only.
Response:
```
{
  held_total: number,
  released_total: number,
  completed_jobs: number,
  reputation_score: number | null
}
```

---

## Jobs

### `POST /jobs`
Requires auth, client only.
Request:
```
{
  trade: string,           // must be a locked trade value
  location: string,
  urgency: "Today" | "This Week" | "Flexible",
  description: string,
  budget?: number,
  photos?: string[]
}
```
Response: `{ jobId: string }`
400 with a clear message on any validation failure (empty trade, invalid urgency, oversized location string, etc.)

### `GET /jobs/:id`
Requires auth, owner only (the client who posted it, or the matched artisan).
Response: `Job`

### `GET /jobs/:id/matches`
Requires auth, client (job owner) only.
Response: `MatchedArtisan[]` — ranked list (distance sort, then completed_jobs/reputation_score tiebreaker). Empty array if no matches — render the empty state, this is not an error.

---

## Payments

### `POST /payments/initialize`
Requires auth, client only.
Request: `{ jobId: string, artisanId: string }`
Response: `{ authorizationUrl: string, reference: string }` — redirect the client to `authorizationUrl` (Paystack checkout).

### `POST /jobs/:id/unlock-chat`
Requires auth. Only works once the related transaction is `held` — call this right after payment confirms, before attempting to open the chat thread.
Response: `{ success: boolean }`

---

## Messaging (in-app chat — replaces WhatsApp handoff entirely)

### `POST /matches/:matchId/messages`
Requires auth, must be the client or artisan on that match.
Request: `{ text: string, photo_url?: string }`
Response: `Message`

### `GET /matches/:matchId/messages`
Requires auth, same ownership check.
Response: `Message[]`

**Real-time delivery — confirm before building the chat UI:** whether this is backed by Firestore listeners (live push updates, no polling needed) or a plain REST fetch-on-open. This determines whether the chat screen needs a persistent listener subscription or a simple fetch-on-mount + manual refresh. Flagged as unresolved in the backend build doc — don't assume either way.

---

## Job completion & rating

### `POST /jobs/:id/complete`
Requires auth, client (job owner) only.
Response: `{ success: boolean }`
Safe to call once — calling it again on an already-completed job is a no-op, not a double-release, but don't rely on that; disable the button client-side after first success.

### `POST /jobs/:id/rating`
Requires auth, client only.
Request: `{ rating: number, review?: string }` — rating must be 1-5
Response: `{ success: boolean }`
Returns `409 Conflict` if a rating already exists for this match — handle this in the UI as "you've already rated this job," not as a generic error.

---

## Admin (separate dashboard only)

### `GET /admin/verification-queue`
Admin auth only.
Response: `ArtisanProfile[]` (artisans with `verified = false`)

### `POST /admin/verify/:uid`
Admin auth only.
Response: `{ success: boolean }`

---

## Shared types (for reference — confirm exact TypeScript definitions with Backend)

```ts
interface User {
  uid: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: "client" | "artisan";
}

interface ArtisanProfile {
  uid: string;
  trade: string;
  category: string;
  location: string;
  available: boolean;
  verified: boolean;
  nin_verified: boolean;   // nin itself is never included
  services: string[];
  work_photos: string[];
  completed_jobs: number;
  reputation_score: number | null;
  tagline: string;
}

interface Job {
  job_id: string;
  client_uid: string;
  trade: string;
  location: string;
  urgency: "Today" | "This Week" | "Flexible";
  budget: number | null;
  description: string;
  match_fee: number;
  status: "open" | "matched" | "complete" | "cancelled";
}

interface Message {
  message_id: string;
  match_id: string;
  sender_uid: string;
  text: string;
  photo_url: string | null;
  created_at: string;
  read_at: string | null;
}
```

## What NOT to build against
- **No wallet/balance endpoints exist.** Payment is per-job — don't design screens around a persistent balance.
- **No WhatsApp deep link.** Contact/communication happens through `unlock-chat` + the messages endpoints only.
- **No email/password endpoints for client/artisan accounts.** Phone + OTP only for these two roles — the register/reset-password endpoints are admin-dashboard-only.
