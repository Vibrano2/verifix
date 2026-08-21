# Artiva Frontend Integration Guide & Complete API Contract

Base URL:
```env
VITE_API_BASE_URL=https://us-central1-artiva-f24a8.cloudfunctions.net/api
# Or local emulator:
# VITE_API_BASE_URL=http://localhost:5001/artiva-f24a8/us-central1/api
```

---

## 1. Authentication & User Management

All authenticated requests require the Firebase ID token in the header:
```http
Authorization: Bearer <firebase_id_token>
```

### A. Register Client User
* **Endpoint**: `POST /api/auth/register/client` (or `POST /api/auth/register`)
* **Payload**:
```json
{
  "idToken": "<firebase_id_token>",
  "first_name": "Chioma",
  "last_name": "Eze",
  "role": "client"
}
```
* **Response (201 Created)**:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "uid": "usr_948274",
    "first_name": "Chioma",
    "last_name": "Eze",
    "role": "client"
  }
}
```

### B. Register Artisan Profile (3-Step Final Submission)
* **Endpoint**: `POST /api/artisans` (or `POST /api/auth/register/artisan`)
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Payload**:
```json
{
  "first_name": "Ade",
  "last_name": "Ogunleye",
  "trade": "Plumbing",
  "skills": ["Pipe Fitting", "Drain Unclogging", "Water Heaters"],
  "location": {
    "address": "14 Allen Avenue",
    "city": "Ikeja",
    "state": "Lagos",
    "lga": "Ikeja"
  },
  "hourly_rate": 5000,
  "experience_years": 8,
  "nin": "12345678901",
  "bank_details": {
    "account_number": "0123456789",
    "bank_code": "058"
  },
  "id_document_base64": "data:image/jpeg;base64,...",
  "work_photos_base64": [
    "data:image/jpeg;base64,..."
  ]
}
```

### C. Login & Verify Firebase Session
* **Endpoint**: `POST /api/auth/login` (or `POST /api/auth/firebase/verify`)
* **Payload**:
```json
{
  "idToken": "<firebase_id_token>",
  "role": "client"
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "uid": "usr_948274",
    "email": "chioma@example.com",
    "role": "client"
  }
}
```

### D. Phone OTP Verification Flow
* **Send OTP**: `POST /api/auth/phone/send-otp`
  ```json
  { "phone": "+2348012345678" }
  ```
* **Verify OTP**: `POST /api/auth/phone/verify-otp`
  ```json
  {
    "phone": "+2348012345678",
    "otp": "123456",
    "role": "client"
  }
  ```

### E. Password Reset Recovery
* **Endpoint**: `POST /api/auth/reset-password`
* **Payload**:
```json
{ "email": "user@example.com" }
```

### F. Get Current User Profile
* **Endpoint**: `GET /api/auth/me` (or `GET /api/auth/session`)
* **Headers**: `Authorization: Bearer <firebase_id_token>`

---

## 2. Artisan Directory & Matching System

### A. Browse & Search Artisans
* **Endpoint**: `GET /api/artisans?trade=Plumbing&location=Lagos&available=true`
* **Response**:
```json
{
  "success": true,
  "data": [
    {
      "uid": "art_102",
      "first_name": "Ade",
      "last_name": "Ogunleye",
      "trade": "Plumbing",
      "reputation_score": 4.9,
      "completed_jobs": 34,
      "hourly_rate": 5000,
      "work_photos": ["https://storage.googleapis.com/..."]
    }
  ]
}
```

### B. Get Artisan Public Profile
* **Endpoint**: `GET /api/artisans/:id`
* **Headers**: `Authorization: Bearer <firebase_id_token>`

### C. Artisan Profile Self-Management
* **Get Own Profile**: `GET /api/artisans/me`
* **Update Profile**: `PUT /api/artisans/me` or `PATCH /api/artisans/me`
* **Toggle Availability**: `PATCH /api/artisans/:uid/availability`
  ```json
  { "is_available": true }
  ```
* **Artisan Dashboard Stats**: `GET /api/artisans/:uid/dashboard`

---

## 3. Job Posting & Proforma (Quote) Workflow

### A. Post a Job
* **Endpoint**: `POST /api/jobs`
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Payload**:
```json
{
  "trade": "Plumbing",
  "description": "Burst pipe leaking under kitchen sink",
  "location": {
    "address": "Block 4, Lekki Phase 1",
    "city": "Lagos",
    "state": "Lagos"
  },
  "timing": "Today",
  "budget": 20000,
  "photos": ["https://storage.googleapis.com/..."]
}
```
* **Response**:
```json
{
  "success": true,
  "data": {
    "id": "job_8372",
    "status": "open",
    "trade": "Plumbing"
  }
}
```

### B. Fetch Job Matches & Select Artisan
* **Get Ranked Matches**: `GET /api/jobs/:id/matches`
* **Select Artisan for Job**: `POST /api/jobs/:id/select-artisan`
  ```json
  { "artisan_id": "art_102" }
  ```

### C. Submit Proforma Invoice (Artisan)
* **Endpoint**: `POST /api/proforma` (or `POST /api/proforma/submit`)
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Payload**:
```json
{
  "job_id": "job_8372",
  "supplier_name": "Abuja Plumbing Supplies",
  "materials_cost": 35000,
  "labor_cost": 15000,
  "total_amount": 50000,
  "items": [
    { "name": "PPR Pipes (4 pcs)", "quantity": 4, "unit_price": 5000, "total": 20000 },
    { "name": "Brass Ball Valve", "quantity": 3, "unit_price": 5000, "total": 15000 }
  ],
  "receipt_url": "https://storage.googleapis.com/..."
}
```

### D. Get Job Proformas
* **Endpoint**: `GET /api/proforma/job/:jobId`

---

## 4. Real-time Features (Chat & Live GPS Tracking)

### A. In-App Chat
Use Firestore real-time listeners on the client:
```javascript
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

// Real-time messages listener
const messagesRef = collection(db, 'jobs', jobId, 'messages');
const q = query(messagesRef, orderBy('created_at', 'asc'));

const unsubscribe = onSnapshot(q, (snapshot) => {
  const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  setMessages(messages);
});
```
* **REST Fallback**:
  * Fetch: `GET /api/chat/job/:jobId`
  * Send: `POST /api/chat/job/:jobId` with `{ "content": "I am on my way" }`

### B. Live Artisan GPS Tracking
* **Start Tracking**: `POST /api/jobs/:id/tracking/start`
* **Arrived at Location**: `POST /api/jobs/:id/tracking/arrive`
* **Realtime Coordinates**:
  Artisan updates `jobs/{jobId}/tracking` in Firestore:
  ```javascript
  {
    latitude: 9.0765,
    longitude: 7.3986,
    heading: 180,
    status: 'en_route',
    updated_at: serverTimestamp()
  }
  ```
  Client listens with `onSnapshot(doc(db, 'jobs', jobId, 'tracking'), callback)`.

---

## 5. Payments & Escrow (Paystack)

### A. Initialize Payment Intent
* **Endpoint**: `POST /api/payments/initialize` (or `/api/payments/initialise`)
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Payload**:
```json
{
  "match_id": "match_8372",
  "job_value": 20000
}
```
* **Response**:
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/access_code_...",
    "access_code": "0pe29gasn8",
    "reference": "verifix_172948201"
  }
}
```

### B. Verify Payment
* **Endpoint**: `POST /api/payments/verify`
* **Payload**:
```json
{ "reference": "verifix_172948201" }
```

### C. Webhook (Paystack)
* **Endpoint**: `POST /api/payments/webhook`
* **Headers**: `x-paystack-signature: <hmac_sha512>`

---

## 6. Job Completion, Ratings & Reviews

### A. Complete Job & Submit Rating
* **Endpoint**: `POST /api/jobs/:id/complete`
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Payload**:
```json
{
  "match_id": "match_8372",
  "rating": 5,
  "review": "Excellent work, fixed the leak in less than 30 minutes!"
}
```
* *Automatically marks job completed, updates artisan reputation score, and triggers escrow payout release.*

### B. Raise a Dispute
* **Endpoint**: `POST /api/jobs/:id/dispute`
* **Payload**:
```json
{ "reason": "Artisan did not show up after payment." }
```

---

## 7. Admin & Moderation Panel

All admin endpoints require `role: 'admin'`.

| Endpoint | Method | Purpose |
| :--- | :---: | :--- |
| `/api/admin/stats` | `GET` | Overall dashboard metrics |
| `/api/admin/analytics` | `GET` | Deep analytics (revenue, dispute rate, zero-results) |
| `/api/admin/queue/artisans` | `GET` | Pending artisan verification queue |
| `/api/admin/verify/artisan/:uid` | `POST` / `PUT` | Approve artisan ID verification |
| `/api/admin/reject/:uid` | `POST` | Reject artisan verification |
| `/api/admin/queue/proformas` | `GET` | Pending proforma quotes |
| `/api/admin/proforma/:id/approve` | `POST` | Approve proforma & disburse materials escrow |
| `/api/admin/proforma/:id/reject` | `POST` | Reject proforma quote |
| `/api/admin/flags` | `GET` | Artisans flagged for no-response timeouts |

---

## 8. Cloud Storage & File Uploads

### Work Photos & ID Documents
Use base64 within signup/job creation payloads or multipart upload:
* **Artisan Work Photo**: `POST /api/artisans/:uid/photo` (form-data: `file`)
* **ID Document**: `POST /api/artisans/:uid/id-document` (form-data: `nin`, `file`)
