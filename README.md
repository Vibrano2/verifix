# Verifix backend

Verifix is the canonical Firebase backend for the Artiva marketplace. It provides the authenticated REST API, Firestore and Storage policy, Paystack payment orchestration, and an optional private Cloud Run matching service. The separate `artiva` repository owns the web frontend and Firebase Hosting configuration.

## Runtime architecture

- Firebase Cloud Functions, Node.js 20, TypeScript, Express
- Firebase Authentication, Firestore, and Cloud Storage
- Paystack transaction, transfer-recipient, transfer, refund, verification, and webhook APIs
- Python 3.12 Flask/Gunicorn ML service on private Cloud Run

Clients authenticate with a Firebase ID token in `Authorization: Bearer <token>`. Authorization is derived on the server from the persisted user role and the configured `ADMIN_UID`. Browser code is not trusted to choose a role, payment amount, recipient, resource owner, or final payment state.

## Local development

Prerequisites are Node.js 20, Java 21 or later for Firebase emulators, Python 3.12, and the Firebase CLI installed by the functions package.

```bash
cd functions
npm ci
npm run check
npm run test:rules
```

Copy `functions/.env.example` to `functions/.env` only for non-secret emulator configuration. Development OTP endpoints exist only when both `FUNCTIONS_EMULATOR=true` and `ENABLE_DEV_AUTH=true`; they are not registered in production.

ML checks:

```bash
cd ml-service
python -m pip install --requirement requirements.txt
python -m unittest discover -s tests -v
docker build --tag artiva-ml:test .
```

Model files are loaded only when their expected SHA-256 values are configured. Treat pickle files as executable artifacts: build them in a trusted pipeline, store them in a controlled bucket, and deploy their checksums as `ARTISAN_MODEL_SHA256` and `CUSTOMER_MODEL_SHA256`.

## Production configuration

Create function secrets without placing their values in a tracked file:

```bash
firebase functions:secrets:set PAYSTACK_SECRET_KEY
firebase functions:secrets:set ENCRYPTION_KEY
firebase functions:secrets:set ADMIN_UID
```

Set `FIREBASE_WEB_API_KEY` and `ALLOWED_ORIGINS` as runtime parameters. Keep `ENABLE_API_DOCS` and `ENABLE_DEV_AUTH` disabled in production. The encryption key must be a cryptographically random value of at least 32 bytes and must have a documented rotation and recovery procedure.

Configure the Paystack webhook for the deployed `/api/payments/webhook` route. Confirm the exact generated function URL before saving it because Firebase URLs vary by generation and routing setup. Paystack is the authority for final charge, transfer, and refund status; the API verifies webhook HMAC signatures against the exact raw body and reconciles event metadata before changing state.

## Deployment

The workflows in `.github/workflows` use GitHub OIDC and Google Workload Identity Federation. Configure:

- `GCP_PROJECT_ID`
- `WIF_PROVIDER`
- `WIF_SERVICE_ACCOUNT`
- `MODEL_BUCKET_NAME`
- `ARTISAN_MODEL_SHA256`
- `CUSTOMER_MODEL_SHA256`

Grant the deployment service account only the roles needed for Functions, Firestore rules/indexes, Storage rules, Artifact Registry, and Cloud Run. The ML service is deployed without unauthenticated access.

## Security model

- Firestore and Storage are deny-by-default. Sensitive writes, admin operations, payments, matching, chat membership, completion, ratings, and identity-document review go through the Admin SDK API.
- Direct Firestore access is limited to each user's notifications and tightly scoped participant or owner reads. An `artiva_admin` custom claim does not grant direct database access.
- Identity documents and payout details are stored outside public artisan profiles. Sensitive strings use authenticated encryption; audit identifiers use keyed hashing.
- Uploads have byte limits, generated object names, allowlisted content types, and magic-byte validation.
- Payment initialization derives the amount and selected artisan from server state. Completion and rating use transactions and deterministic locks to prevent duplicate processing.
- API responses use strict CORS, security headers, request-size limits, rate limiting, generic production errors, and minimized health output.

See [SECURITY.md](./SECURITY.md) for operating requirements and residual risks.
