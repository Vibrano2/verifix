# Artiva Frontend Integration Guide & API Contract

This document provides the complete API contract, payload formats, authentication patterns, and workflow diagrams needed to integrate the Artiva frontend with the Verifix backend.

---

## 1. Environment Configuration

Place the following keys in your frontend environment file (`.env` / `.env.development` / `.env.production`):

```env
# Backend Base API URL
VITE_API_BASE_URL=https://us-central1-artiva-a0594.cloudfunctions.net/api

# Firebase Web Client SDK Config
VITE_FIREBASE_API_KEY=AIzaSyA5u_VUZZIzV5-0JD48JhQ127T9c6o5LgI
VITE_FIREBASE_AUTH_DOMAIN=artiva-a0594.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=artiva-a0594
VITE_FIREBASE_STORAGE_BUCKET=artiva-a0594.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=140829451221
VITE_FIREBASE_APP_ID=1:140829451221:web:44ea0b64ddb5dab339535c

# Paystack Public Key
VITE_PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key_here
```

---

## 2. Authentication & User Sync Flow

Every authenticated API request requires the Firebase ID token passed in the Authorization header:

```http
Authorization: Bearer <firebase_id_token>
```

### Authorization Header Helper

```javascript
import { auth } from './config/firebase';

export async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) return { 'Content-Type': 'application/json' };
  const token = await user.getIdToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}
```

### A. New User Registration
- **Method / Endpoint**: `POST /v1/auth/register`
- **Payload**:

```json
{
  "idToken": "<firebase_id_token>",
  "first_name": "Jane",
  "last_name": "Doe",
  "role": "client" // "client" | "artisan"
}
```

### B. Returning User Login Sync
- **Method / Endpoint**: `POST /v1/auth/firebase/verify`
- **Payload**:

```json
{
  "idToken": "<firebase_id_token>",
  "role": "client"
}
```

---

## 3. Artisan Onboarding & Directory

### A. Register Artisan Profile (Multipart or Base64)
- **Method / Endpoint**: `POST /v1/artisans`
- **Payload**:

```json
{
  "idToken": "<firebase_id_token>",
  "first_name": "Ade",
  "last_name": "Ogunleye",
  "trade": "Plumbing",
  "location": {
    "city": "Ikeja",
    "state": "Lagos",
    "lga": "Ikeja",
    "address": "14 Allen Avenue"
  },
  "tagline": "Master Plumber & Pipe Specialist",
  "bio": "10+ years installing industrial and residential piping.",
  "hourly_rate": 5000,
  "experience_years": 10,
  "skills": ["Pipe Fitting", "Drain Cleaning", "Water Heaters"],
  "nin": "12345678901",
  "bank_details": {
    "account_number": "0123456789",
    "bank_code": "058"
  },
  "id_document_base64": "data:image/jpeg;base64,...",
  "work_photos_base64": [
    "data:image/jpeg;base64,...",
    "data:image/jpeg;base64,..."
  ]
}
```

### B. Search & Browse Verified Artisans
- **Method / Endpoint**: `GET /v1/artisans?trade=Plumbing&location=Lagos&available=true`
- **Response**:

```json
{
  "success": true,
  "data": [
    {
      "uid": "artisan_123",
      "trade": "Plumbing",
      "tagline": "Master Plumber & Pipe Specialist",
      "hourly_rate": 5000,
      "reputation_score": 4.9,
      "completed_jobs": 28,
      "work_photos": ["https://storage.googleapis.com/..."]
    }
  ]
}
```

---

## 4. Job Lifecycle & Escrow Integration

```mermaid
sequenceDiagram
    participant Client as Client (Frontend)
    participant Backend as Backend API
    participant Paystack as Paystack Gateway
    participant Artisan as Artisan (Frontend)

    Client->>Backend: 1. POST /v1/jobs (Post job)
    Client->>Backend: 2. POST /api/jobs/:id/match (Match artisans)
    Client->>Backend: 3. GET /api/jobs/:id/matches (Get ranked matches)
    Client->>Backend: 4. POST /v1/jobs/:id/select-artisan (Select artisan)
    Client->>Paystack: 5. Pay Job Amount (Escrow deposit)
    Client->>Backend: 6. POST /v1/payments/verify (Verify & lock funds in escrow)
    Artisan->>Backend: 7. POST /v1/jobs/:id/tracking/start (En route)
    Artisan->>Backend: 8. POST /v1/jobs/:id/tracking/arrive (Arrived)
    Client->>Backend: 9. POST /v1/jobs/:id/complete (Mark complete & Rate)
    Backend->>Paystack: 10. Auto-release Escrow transfer to Artisan
```

### Step 1: Create Job
- **Method / Endpoint**: `POST /v1/jobs`
- **Headers**: `Authorization: Bearer <idToken>`
- **Payload**:

```json
{
  "trade": "Plumbing",
  "description": "Burst pipe under kitchen sink flooding floor",
  "location": {
    "address": "Block 2, Lekki Phase 1",
    "city": "Lagos",
    "state": "Lagos"
  },
  "timing": "ASAP",
  "budget": 20000
}
```

### Step 2: Trigger Matching
- **Method / Endpoint**: `POST /api/jobs/:id/match`
- **Headers**: `Authorization: Bearer <idToken>`

### Step 3: Fetch Matches
- **Method / Endpoint**: `GET /api/jobs/:id/matches`
- **Headers**: `Authorization: Bearer <idToken>`

### Step 4: Select Artisan
- **Method / Endpoint**: `POST /v1/jobs/:id/select-artisan`
- **Headers**: `Authorization: Bearer <idToken>`
- **Payload**:

```json
{
  "artisan_id": "artisan_uid_123"
}
```

### Step 5: Escrow Payment via Paystack

```javascript
const handler = window.PaystackPop.setup({
  key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
  email: user.email,
  amount: job.budget * 100, // Amount in kobo
  currency: 'NGN',
  callback: async (response) => {
    // response.reference
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/v1/payments/verify`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({ reference: response.reference })
    });
  }
});
handler.openIframe();
```

### Step 6: Live Tracking
- **Artisan starts journey**: `POST /v1/jobs/:id/tracking/start`
- **Artisan arrives on site**: `POST /v1/jobs/:id/tracking/arrive`
- Frontend can listen to the Firestore document `/jobs/:id` for live status updates (`en_route` -> `arrived`).

### Step 7: Mark Job Complete & Release Escrow
- **Method / Endpoint**: `POST /v1/jobs/:id/complete`
- **Headers**: `Authorization: Bearer <idToken>`
- **Payload**:

```json
{
  "match_id": "match_uid_123",
  "rating": 5,
  "review": "Punctual, fast, and fixed the pipe completely!"
}
```

*(Backend automatically initiates instant transfer to artisan's verified bank account upon completion)*

---

## 5. Admin Queue & Verification Endpoints

- **Fetch Pending Artisans**: `GET /v1/admin/artisans/pending`
- **Approve Artisan**: `PATCH /v1/admin/artisans/:uid/verify` with `{ "verified": true }`
- **Reject Artisan**: `PATCH /v1/admin/artisans/:uid/verify` with `{ "verified": false, "reason": "Unclear ID document" }`
- **Resolve Dispute**: `POST /v1/admin/disputes/:id/resolve` with `{ "action": "refund_client" | "payout_artisan" }`
