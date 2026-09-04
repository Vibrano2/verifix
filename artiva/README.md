# Artiva frontend

Copy `.env.example` to `.env.local` and replace placeholder Firebase web-app
values. Only `VITE_` variables are exposed to the browser; never put Paystack,
encryption, or administrative credentials in this file.

`src/api.ts` is the sole REST client. It uses `/api` in hosted deployments,
adds the current Firebase ID token to authenticated requests, and retries once
after a 401 with a refreshed token. Use `verifyOtp` to exchange the backend's
OTP custom token for a Firebase Auth session.

Use the Firebase client SDK (`src/firebase.ts`) only for Firestore operations
allowed by `firestore.rules`. Payments, OTPs, privileged actions, and
server-only collections must use the REST API.
