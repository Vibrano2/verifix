# Security policy and operating guide

This document describes the implemented controls and the work operators must complete before production launch. It is not a certification or a substitute for an independent penetration test, privacy review, or legal advice.

## Trust boundaries

Firebase Authentication establishes identity. The API then loads the persisted role and checks resource ownership or participation on every protected operation. The sole administrator identity is the exact `ADMIN_UID` runtime secret. Client-supplied roles, UIDs, amounts, status fields, recipient codes, and custom admin claims are not authorization inputs.

The Admin SDK bypasses Firebase Security Rules, so API validation and authorization are mandatory. Browser-accessible Firestore and Storage policy is deny-by-default. Direct database access is intentionally narrow and does not include administrator access.

## Implemented controls

- Firebase ID tokens are verified, including revocation checks outside the emulator.
- Development OTP and custom-token helpers are registered only in the emulator when explicitly enabled.
- CORS is an exact origin allowlist; wildcard production origins are rejected.
- JSON bodies are limited, security headers are set, and authentication and abuse-sensitive routes are rate-limited.
- Zod schemas reject unknown or invalid state-changing inputs.
- User ownership, job ownership, match participation, and role checks guard object access.
- Identity files are private and reviewed through short-lived signed URLs.
- File upload size, media type, filename, and magic bytes are validated.
- Sensitive profile fields use AES-256-GCM with a required runtime key. Audit identifiers are HMAC-derived.
- Paystack webhook signatures are compared in constant time over the exact raw request body.
- Charge events are accepted only after reference, amount, currency, job, match, payer, and metadata reconciliation.
- Transfer and refund requests remain pending until provider verification or webhook confirmation establishes a final state.
- Completion, rating, matching, and payment operations use Firestore transactions or deterministic lock documents for replay and race resistance.
- API documentation is disabled by default, health output is minimal, and production errors do not expose stack traces.
- ML artifacts require configured SHA-256 checksums, request schemas are bounded, the container runs as a non-root user, and Cloud Run remains private.

## Secret management

Store `PAYSTACK_SECRET_KEY`, `ENCRYPTION_KEY`, and `ADMIN_UID` in Google Secret Manager through Firebase secret parameters. Do not put them in `.env`, GitHub variables, workflow YAML, build arguments, container layers, logs, or test fixtures. `FIREBASE_WEB_API_KEY` is not a server secret, but its Firebase API-key restrictions should still be configured.

If a credential or encryption key was ever committed, deleting the current file is insufficient. Immediately revoke or rotate it, review provider and Firebase audit logs, remove it from Git history where appropriate, and notify affected stakeholders under the incident-response plan. Rotating `ENCRYPTION_KEY` requires re-encrypting existing ciphertext or retaining a secure versioned key-decryption path.

## Pre-launch requirements

- Rotate every previously used Paystack and encryption credential.
- Set a dedicated administrator UID and remove stale admin custom claims.
- Configure GitHub OIDC/WIF and least-privilege deployment IAM. Do not use service-account JSON keys.
- Restrict Firebase API keys, authorized domains, Authentication providers, Storage CORS, and budget alerts.
- Configure exact production origins and keep development switches disabled.
- Verify Paystack webhook delivery, retries, signature rejection, duplicate events, transfer failures, and refund failures in test mode.
- Test Firestore and Storage rules against production-shaped fixtures.
- Add centralized alerting for authentication anomalies, webhook failures, stuck pending payments, failed payouts/refunds, and repeated rate-limit events.
- Define backups, restore drills, retention periods, data-subject request handling, breach response, and key rotation.
- Obtain Nigerian payments, consumer-protection, tax, NDPR/Nigeria Data Protection Act, and marketplace terms review. Confirm whether the product may legally describe its payment flow as escrow.
- Complete dependency scanning, secret scanning, static analysis, penetration testing, and abuse testing before accepting live payments.

## Responsible disclosure

Do not open a public issue containing exploit details, credentials, personal data, or payment references. Send a minimal report to the project owner through a private channel and include the affected component, reproduction steps, impact, and suggested mitigation. Rotate exposed credentials before investigating further.

## Supported scope

Security fixes are maintained on the default branch. Production deployments should use an immutable reviewed commit, pass all CI checks, and have an identified rollback owner. Review this document whenever authentication, authorization, payment state, uploads, Firebase rules, cryptography, or deployment IAM changes.
