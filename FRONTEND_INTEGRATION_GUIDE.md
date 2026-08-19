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

**Endpoint**: `POST /v1/auth/register`

**Payload**:

```json
{
  "idToken": "<firebase_id_token>",
  "first_name": "Jane",
  "last_name": "Doe",
  "role": "client"
}
```

### B. Returning User Login Sync

**Endpoint**: `POST /v1/auth/firebase/verify`

**Payload**:

```json
{
  "idToken": "<firebase_id_token>",
  "role": "client"
}
```

---

## 3. Artisan Onboarding & Directory

### A. Register Artisan Profile

**Endpoint**: `POST /v1/artisans`

**Payload**:

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

**Endpoint**: `GET /v1/artisans?trade=Plumbing&location=Lagos&available=true`

**Response**:

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

**Endpoint**: `POST /v1/jobs`

**Headers**: `Authorization: Bearer <idToken>`

**Payload**:

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

**Endpoint**: `POST /api/jobs/:id/match`

**Headers**: `Authorization: Bearer <idToken>`

### Step 3: Fetch Matches

**Endpoint**: `GET /api/jobs/:id/matches`

**Headers**: `Authorization: Bearer <idToken>`

### Step 4: Select Artisan

**Endpoint**: `POST /v1/jobs/:id/select-artisan`

**Headers**: `Authorization: Bearer <idToken>`

**Payload**:

```json
{
  "artisan_id": "artisan_uid_123"
}
```

### Step 5: Escrow Payment via Paystack

> [!IMPORTANT]
> The backend calculates the final payment total (`Budget + ₦500 Platform Fee`). Do not rely on frontend calculations.

**Endpoint**: `POST /v1/payments/initialise`

**Headers**: `Authorization: Bearer <idToken>`

**Payload**:
```json
{
  "match_id": "match_uid_123"
}
```

**Response**:
```json
{
  "message": "Payment initialized successfully",
  "transaction_id": "tx_abc123",
  "authorization_url": "https://checkout.paystack.com/...",
  "access_code": "..."
}
```
*Frontend Action: Redirect the user to the `authorization_url` to complete payment. Paystack will send a webhook to the backend to lock the funds in Escrow.*

### Step 6: Live Tracking

- **Artisan starts journey**: `POST /v1/jobs/:id/tracking/start`
- **Artisan arrives on site**: `POST /v1/jobs/:id/tracking/arrive`

The frontend can listen directly to Firestore document `/jobs/:id` for status transitions (`en_route` -> `arrived`).

### Step 7: Mark Job Complete & Release Escrow

**Endpoint**: `POST /v1/jobs/:id/complete`

**Headers**: `Authorization: Bearer <idToken>`

**Payload**:

```json
{
  "match_id": "match_uid_123",
  "rating": 5,
  "review": "Punctual, fast, and fixed the pipe completely!"
}
```

---

## 5. Admin Queue & Verification Endpoints

- **Fetch Pending Artisans**: `GET /v1/admin/verification-queue`
- **Approve Artisan**: `POST /v1/admin/verify/:uid`
- **Reject Artisan**: `POST /v1/admin/reject/:uid` (Send `{"reason": "..."}`)

---

## 6. Chat & Messaging (Phase 7)

**Endpoint Base**: `/v1/chat/job/:jobId`

> [!NOTE]
> Only the Client who created the job and the Artisan assigned to the job have access to these endpoints.

### Fetch Messages
**GET** `/v1/chat/job/:jobId?limit=50`
**Headers**: `Authorization: Bearer <idToken>`
**Response**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg_123",
        "sender_uid": "user_456",
        "content": "I am on my way!",
        "is_read": false,
        "created_at": "2024-05-20T10:30:00Z"
      }
    ]
  }
}
```

### Send Message
**POST** `/v1/chat/job/:jobId`
**Headers**: `Authorization: Bearer <idToken>`
**Payload**:
```json
{
  "content": "Are you here yet?"
}
```

---

## 7. Proforma Invoices (Material Escrow)

### Artisan Submits Invoice
**POST** `/v1/proforma`
**Headers**: `Authorization: Bearer <idToken>`
**Payload**:
```json
{
  "job_id": "job_123",
  "supplier_name": "Lekki Plumbing Supplies",
  "supplier_bank_details": {
    "account_name": "LPS Ltd",
    "account_number": "1234567890",
    "bank_code": "058"
  },
  "total_amount": 15000,
  "items": [
    {
      "description": "PVC Pipes",
      "quantity": 5,
      "unit_price": 3000,
      "total": 15000
    }
  ]
}
```

### Fetch Job Proformas (Client or Artisan)
**GET** `/v1/proforma/job/:jobId`
**Headers**: `Authorization: Bearer <idToken>`

### Admin Proforma Endpoints (Phase 12)
- **GET** `/v1/admin/proforma-queue` (List all pending proformas)
- **POST** `/v1/admin/proforma/:id/approve` (Triggers Escrow partial release)
- **POST** `/v1/admin/proforma/:id/reject` (Payload: `{"reason": "Invalid pricing"}`)
