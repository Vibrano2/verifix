# Artiva Backend API Specification & Integration Contract

**Base URL**:
```env
VITE_API_BASE_URL=https://us-central1-artiva-f24a8.cloudfunctions.net/api
# Local Emulator:
# VITE_API_BASE_URL=http://localhost:5001/artiva-f24a8/us-central1/api
```

---

## 1. Authentication & User Management

The app supports distinct roles: **Client**, **Artisan**, and **Admin**.  
All authenticated requests must supply the Firebase ID token in the Authorization header:
```http
Authorization: Bearer <firebase_id_token>
```

### Endpoints

#### `POST /api/auth/register/client` (or `POST /api/auth/register`)
Register a standard client user.
* **Headers**: `Content-Type: application/json`
* **Request Payload**:
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

#### `POST /api/auth/register/artisan` (or `POST /api/artisans`)
Register an artisan with profile details, skills, banking info, and verification documents.
* **Headers**: `Authorization: Bearer <firebase_id_token>`, `Content-Type: application/json`
* **Request Payload**:
```json
{
  "first_name": "Ade",
  "last_name": "Ogunleye",
  "trade": "Plumbing",
  "skills": ["Pipe Fitting", "Drain Cleaning", "Water Heaters"],
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
* **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Artisan registered successfully",
  "data": {
    "uid": "art_102",
    "trade": "Plumbing",
    "is_verified": false
  }
}
```

#### `POST /api/auth/login` (or `POST /api/auth/firebase/verify`)
Authenticate and verify user session with a Firebase ID token.
* **Request Payload**:
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
    "email": "user@example.com",
    "role": "client"
  }
}
```

#### `POST /api/auth/phone/send-otp` & `POST /api/auth/phone/verify-otp` (or `POST /api/auth/verify`)
OTP verification for `VerificationPendingScreen`.
* **Send OTP Payload**:
```json
{ "phone": "+2348012345678" }
```
* **Verify OTP Payload**:
```json
{
  "phone": "+2348012345678",
  "otp": "123456",
  "role": "client"
}
```

#### `POST /api/auth/reset-password`
Password recovery flow.
* **Request Payload**:
```json
{ "email": "user@example.com" }
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

#### `GET /api/users/me` (or `GET /api/auth/me`)
Fetch current authenticated user's profile and assigned role.
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Response (200 OK)**:
```json
{
  "success": true,
  "user": {
    "uid": "usr_948274",
    "email": "user@example.com",
    "role": "client"
  }
}
```

---

## 2. Artisan & Matching System

Used in `FindArtisansPage`, `MatchListScreen`, and `ClientArtisanProfileScreen`.

### Endpoints

#### `GET /api/artisans`
Search and filter artisans by category, location, rating, and availability.
* **Query Parameters**:
  * `trade` (string, optional) - e.g., `Plumbing`
  * `location` (string, optional) - e.g., `Lagos`
  * `available` (boolean, optional) - e.g., `true`
* **Response (200 OK)**:
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
      "is_verified": true,
      "work_photos": ["https://storage.googleapis.com/..."]
    }
  ]
}
```

#### `GET /api/artisans/:id`
Get detailed artisan profile, portfolio, badges, and reviews.
* **Headers**: `Authorization: Bearer <firebase_id_token>`

#### `POST /api/artisans/match` (or `GET /api/jobs/:id/matches`)
Auto-matches a client's job request with the best available artisans nearby based on proximity and rating.
* **Request Payload**:
```json
{ "job_id": "job_8372" }
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "match_id": "match_9482",
        "artisan": {
          "uid": "art_102",
          "trade": "Plumbing",
          "reputation_score": 4.9,
          "completed_jobs": 34
        }
      }
    ],
    "count": 1
  }
}
```

#### `PUT /api/artisans/me` (or `PATCH /api/artisans/me`)
Allow artisans to update their profile, skills, and pricing without passing a UID in the URL.
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Request Payload**:
```json
{
  "hourly_rate": 6000,
  "skills": ["Pipe Fitting", "Solar Water Heaters"],
  "tagline": "Master Plumber in Lekki & Ikeja"
}
```

---

## 3. Job Posting & Proforma (Quote) Workflow

Used in `PostJobScreen`, `ArtisanProformaScreen`, and `AdminProformaQueueScreen`.

### Endpoints

#### `POST /api/jobs`
Client posts a new job request.
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Request Payload**:
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
* **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Job created successfully",
  "data": {
    "id": "job_8372",
    "status": "open",
    "trade": "Plumbing"
  }
}
```

#### `GET /api/jobs` & `GET /api/jobs/:id`
Fetch job list and detailed view of a specific job.

#### `POST /api/jobs/:id/select-artisan`
Client accepts a matched artisan for the job.
* **Request Payload**:
```json
{ "artisan_id": "art_102" }
```

#### `POST /api/jobs/:id/proforma` (or `POST /api/proforma`)
Artisan submits a proforma quote for a job with itemized materials and labor costs.
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Request Payload**:
```json
{
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

#### `PUT /api/proformas/:id/status` (or `POST /api/admin/proforma/:id/approve`)
Client or Admin approves or rejects a quote.
* **Request Payload**:
```json
{
  "status": "approved",
  "notes": "Materials verified"
}
```

#### `PUT /api/jobs/:id/status`
Update job lifecycle status (`open` -> `matched` -> `in_progress` -> `completed` -> `disputed`).

---

## 4. Real-time Features

Used in `ChatScreen` and `LiveTrackingScreen`.

### A. Chat System
Bi-directional messaging between Client and Artisan once a job is accepted.

* **Client Real-Time Listener (Firestore `onSnapshot`)**:
```javascript
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const messagesRef = collection(db, 'jobs', jobId, 'messages');
const q = query(messagesRef, orderBy('created_at', 'asc'));

const unsubscribe = onSnapshot(q, (snapshot) => {
  const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  setMessages(messages);
});
```

* **REST Fallback Endpoints**:
  * Send Message: `POST /api/chat/job/:jobId` with `{ "content": "I am on my way" }`
  * Fetch History: `GET /api/chat/job/:jobId`

### B. Live GPS Tracking
Artisans stream GPS coordinates when en route to a job; clients subscribe in real time.

* **Artisan Streams GPS**: Update Firestore document `jobs/{jobId}/tracking`:
```json
{
  "latitude": 9.0765,
  "longitude": 7.3986,
  "heading": 180,
  "status": "en_route",
  "updated_at": "serverTimestamp()"
}
```
* **Client Real-Time Listener**:
```javascript
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

const unsubscribe = onSnapshot(doc(db, 'jobs', jobId, 'tracking'), (snapshot) => {
  if (snapshot.exists()) {
    const tracking = snapshot.data();
    setArtisanLocation({ lat: tracking.latitude, lng: tracking.longitude });
  }
});
```
* **Lifecycle Endpoints**:
  * `POST /api/jobs/:id/tracking/start`
  * `POST /api/jobs/:id/tracking/arrive`

---

## 5. Payments Integration (Paystack + Escrow)

Used in `PaystackCheckoutModal`.

### Endpoints

#### `POST /api/payments/initialize` (or `/api/payments/initialise`)
Create a Paystack transaction intent and return the access code and reference to the frontend.
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Request Payload**:
```json
{
  "match_id": "match_9482",
  "job_value": 20000
}
```
* **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/0pe29gasn8",
    "access_code": "0pe29gasn8",
    "reference": "verifix_172948201"
  }
}
```

#### `POST /api/payments/verify`
Verify payment status with reference.
* **Request Payload**:
```json
{ "reference": "verifix_172948201" }
```

#### `POST /api/payments/webhook`
Secure backend endpoint to receive Paystack webhook events (`charge.success`) with HMAC signature verification.

#### `POST /api/payments/payout` (or `POST /api/payments/release/:jobId`)
Transfer funds from platform escrow to the artisan's bank account once a job is completed and approved.

---

## 6. Ratings & Reviews

Used in `JobCompletionRatingModal`.

### Endpoints

#### `POST /api/jobs/:id/reviews` (or `POST /api/jobs/:id/complete`)
Submit a star rating (1–5) and text review after a job is completed.
* **Headers**: `Authorization: Bearer <firebase_id_token>`
* **Request Payload**:
```json
{
  "match_id": "match_9482",
  "rating": 5,
  "review": "Excellent work, fixed the leak in less than 30 minutes!"
}
```
* *Automatically closes the job, updates the artisan's reputation score in Firestore, and initiates escrow payout release.*

#### `GET /api/artisans/:id/reviews`
Fetch reviews to display on the artisan's public profile.

---

## 7. Admin & Moderation Panel

Used in `AdminDashboardScreen`, `AdminQueueScreen`, `AdminProformaQueueScreen`, and `AdminAddArtisanScreen`. All admin endpoints require user claims `role: 'admin'`.

### Endpoints

| Endpoint | Method | Purpose |
| :--- | :---: | :--- |
| `/api/admin/stats` (or `/analytics`) | `GET` | Fetch aggregate dashboard metrics (total users, active jobs, revenue) |
| `/api/admin/queue/artisans` (or `/verification-queue`) | `GET` | List of newly registered artisans awaiting background check/verification |
| `/api/admin/verify/artisan/:id` (or `/verify/:uid`) | `PUT` / `POST` | Approve an artisan's application and grant verification badge |
| `/api/admin/reject/:id` (or `/reject/:uid`) | `POST` | Reject an artisan's application with a reason |
| `/api/admin/queue/proformas` (or `/proforma-queue`) | `GET` | Admin oversight of quotes awaiting price approval |
| `/api/admin/proforma/:id/approve` | `POST` | Approve quote and disburse material funds from escrow |
| `/api/admin/proforma/:id/reject` | `POST` | Reject quote with reason |
| `/api/admin/artisans` | `POST` | Manually add an artisan to the system from the admin panel |

---

## 8. Cloud Storage

* **Provider**: Google Cloud Storage / Firebase Storage.
* **Use Cases**: Profile pictures, Artisan portfolio images, ID document uploads (NIN/CAC), chat attachments, and material purchase receipts.
* **Integration**:
  1. Base64 strings directly in signup/job payloads (`id_document_base64`, `work_photos_base64`).
  2. Multipart upload endpoints:
     * `POST /api/artisans/:uid/photo` (form-data: `file`)
     * `POST /api/artisans/:uid/id-document` (form-data: `nin`, `file`)

---

## Core Database Models Schema

```typescript
// 1. User
interface User {
  id: string;
  role: 'client' | 'artisan' | 'admin';
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  push_token?: string;
  created_at: Date;
}

// 2. ArtisanProfile
interface ArtisanProfile {
  user_id: string;
  trade: string;
  bio?: string;
  hourly_rate: number;
  experience_years: number;
  skills: string[];
  location: {
    address: string;
    city: string;
    state: string;
    lga?: string;
  };
  bank_details?: {
    account_number: string;
    bank_code: string;
  };
  is_verified: boolean;
  reputation_score: number;
  completed_jobs: number;
  work_photos: string[];
}

// 3. Job
interface Job {
  id: string;
  client_id: string;
  artisan_id?: string;
  trade: string;
  description: string;
  status: 'open' | 'matched' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';
  location: {
    address: string;
    city: string;
    state: string;
  };
  budget: number;
  urgency: 'Today' | 'This Week' | 'Flexible';
  created_at: Date;
}

// 4. Proforma / Quote
interface Proforma {
  id: string;
  job_id: string;
  artisan_id: string;
  supplier_name: string;
  materials_cost: number;
  labor_cost: number;
  total_amount: number;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: Date;
}

// 5. Message
interface Message {
  id: string;
  job_id: string;
  sender_id: string;
  content: string;
  created_at: Date;
  read: boolean;
}

// 6. Transaction / Escrow
interface Transaction {
  id: string;
  job_id: string;
  amount: number;
  paystack_reference: string;
  escrow_status: 'HELD' | 'DISBURSED_FULL' | 'DISBURSED_PARTIAL' | 'REFUNDED';
  type: 'escrow' | 'fee' | 'payout';
  created_at: Date;
}

// 7. Review
interface Review {
  id: string;
  job_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number; // 1 - 5
  comment: string;
  created_at: Date;
}
```
