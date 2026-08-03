# Verifix Backend

Firebase + Paystack backend for the Verifix artisan marketplace platform. Connects clients with verified local artisans (electricians, plumbers, carpenters, etc.) in Nigeria.

## 🏗️ Architecture

**Stack:**
- Firebase Cloud Functions (Node.js 18, TypeScript)
- Firestore (NoSQL database)
- Firebase Authentication (Phone/OTP)
- Firebase Storage (file uploads)
- Paystack (payment processing)
- Express.js (API routing)

**Key Features:**
- Phone-based authentication with OTP
- Artisan verification workflow
- Smart matching algorithm (trade + availability + reputation)
- Escrow payment system with 10% platform commission
- Rating and reputation system
- File uploads with security validation
- Admin dashboard

## 📁 Project Structure

```
verifix/
├── functions/
│   ├── src/
│   │   ├── index.ts              # Main entry point
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript types & enums
│   │   ├── middleware/
│   │   │   ├── auth.ts           # Authentication & authorization
│   │   │   └── validation.ts     # Input validation
│   │   ├── routes/
│   │   │   ├── auth.ts           # Authentication endpoints
│   │   │   ├── artisan.ts        # Artisan management
│   │   │   ├── job.ts            # Job & matching
│   │   │   ├── payment.ts        # Paystack integration
│   │   │   └── admin.ts          # Admin functions
│   │   └── utils/
│   │       ├── paystack.ts       # Paystack helpers
│   │       └── fileUpload.ts     # File validation & upload
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules                # Security rules
├── firestore.indexes.json         # Database indexes
├── firebase.json                  # Firebase config
├── .env.example                   # Environment template
├── .gitignore
├── SECURITY.md                    # Security documentation
└── README.md
```

## 🗄️ Firestore Collections

### `users`
User accounts (clients and artisans)
- `uid`, `first_name`, `last_name`, `phone`, `role`, timestamps

### `artisan_profiles`
Artisan details and verification
- `uid`, `trade`, `category`, `location`, `available`, `verified`
- `id_document_url`, `work_photos[]`, `completed_jobs`, `reputation_score`, `tagline`

### `jobs`
Client job postings
- `job_id`, `client_uid`, `trade`, `location`, `urgency`, `budget`
- `description`, `match_fee`, `status`, timestamps

### `matches`
Job-artisan pairings
- `match_id`, `job_id`, `artisan_uid`, `status`, `rating`, timestamps

### `transactions`
Payment records with escrow
- `transaction_id`, `match_id`, `artisan_uid`, `amount`, `status`
- `paystack_reference`, `locked_job_value`, `commission_retained`, `released_at`

## 🔐 Security Features

✅ All endpoints require authentication (Firebase ID token)
✅ IDOR protection with ownership checks
✅ Webhook signature verification (Paystack)
✅ File upload validation (actual MIME type/signature)
✅ Payment gate for contact reveal
✅ Admin access via environment variable (never hardcoded)
✅ Idempotent operations (no double-release)
✅ Input validation (locked enums, length limits)
✅ Firestore security rules

See [SECURITY.md](./SECURITY.md) for complete security documentation.

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18
- Firebase CLI: `npm install -g firebase-tools`
- Firebase project created
- Paystack account (test mode for development)

### 1. Clone and Install

```bash
cd verifix/functions
npm install
```

### 2. Configure Environment

Create `functions/.env` from template:

```bash
cp .env.example functions/.env
```

Edit `functions/.env`:

```env
PAYSTACK_SECRET_KEY=sk_test_your_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_key_here
ADMIN_UID=your_firebase_admin_uid_here
FIREBASE_PROJECT_ID=your-project-id
```

### 3. Firebase Setup

```bash
# Login to Firebase
firebase login

# Initialize project (if needed)
firebase init

# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 4. Deploy Functions

```bash
# Build TypeScript
cd functions
npm run build

# Deploy to Firebase
firebase deploy --only functions
```

### 5. Configure Paystack Webhook

In your Paystack dashboard:
1. Go to Settings → Webhooks
2. Add webhook URL: `https://<region>-<project-id>.cloudfunctions.net/api/payments/webhook`
3. Enable `charge.success` event

## 📡 API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP and create user
- `POST /api/auth/create-custom-token` - Dev helper

### Artisans
- `POST /api/artisans/signup` - Complete artisan profile
- `PATCH /api/artisans/:uid/availability` - Toggle availability
- `POST /api/artisans/:uid/photo` - Upload work photo
- `POST /api/artisans/:uid/id-document` - Upload ID document
- `GET /api/artisans/:uid` - Get profile
- `PATCH /api/artisans/:uid/profile` - Update profile
- `GET /api/artisans/:uid/dashboard` - Dashboard data

### Jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs` - List user's jobs
- `GET /api/jobs/:id` - Get job details
- `PATCH /api/jobs/:id` - Update job
- `POST /api/jobs/:id/match` - Find matching artisans
- `GET /api/jobs/:id/matches` - Get matches for job
- `POST /api/jobs/:id/complete` - Mark complete & release escrow
- `POST /api/jobs/:id/rating` - Submit rating

### Payments
- `POST /api/payments/initialize` - Initialize Paystack payment
- `POST /api/payments/webhook` - Paystack webhook (public)
- `POST /api/jobs/:id/reveal-contact` - Reveal artisan contact (requires payment)
- `GET /api/payments/verify/:reference` - Verify payment

### Admin
- `GET /api/admin/verification-queue` - List unverified artisans
- `POST /api/admin/verify/:uid` - Verify artisan
- `POST /api/admin/reject/:uid` - Reject artisan
- `GET /api/admin/stats` - Platform statistics

## 🧪 Testing

### Local Emulator

```bash
# Start Firebase emulators
firebase emulators:start

# Functions will be available at:
# http://localhost:5001/<project-id>/<region>/api
```

### Test Authentication

```bash
# Create custom token (dev only)
curl -X POST http://localhost:5001/api/auth/create-custom-token \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678"}'

# Use returned token in subsequent requests
curl -X GET http://localhost:5001/api/jobs \
  -H "Authorization: Bearer <token>"
```

## 📊 Matching Algorithm

Artisans matched based on:
1. **Trade** - exact match with job requirement
2. **Availability** - currently available
3. **Verification** - admin-verified only
4. **Sorting**:
   - Primary: `completed_jobs` (descending)
   - Tiebreaker: `reputation_score` (descending)

Returns top 5 matches per job.

## 💰 Commission & Escrow

1. Client posts job with estimated budget
2. System creates matches
3. Client pays match fee (₦500 default) to reveal contact
4. **Payment capture:** `locked_job_value` saved at payment time
5. Client and artisan work together
6. Client marks job complete
7. **Escrow release:** 10% commission calculated from `locked_job_value`
8. Artisan receives 90% of original agreed value

**Key Security:** Commission always uses `locked_job_value` (captured at payment), never current job value (prevents manipulation).

## 🔧 Troubleshooting

### Functions won't deploy
- Check Node.js version: `node --version` (must be 18)
- Build TypeScript: `npm run build`
- Check for syntax errors in compiled `lib/` folder

### Authentication errors
- Verify Firebase ID token is valid
- Check token in `Authorization: Bearer <token>` header
- Token must not be expired

### Paystack webhook not working
- Verify webhook URL in Paystack dashboard
- Check signature validation is passing
- Review Cloud Functions logs: `firebase functions:log`

### File uploads failing
- Check file size (5MB photos, 10MB documents)
- Verify file type (JPEG, PNG, WebP only)
- Ensure Firebase Storage bucket exists

## 📝 Development Guidelines

### Code Style
- Use TypeScript strict mode
- Async/await over promises
- Descriptive error messages
- Log errors with context

### Commits
- Never commit `.env` files
- Never commit real Paystack keys
- Use semantic commit messages

### Testing
- Test with Paystack test mode keys
- Use Firebase emulators for local development
- Test all ownership checks (try accessing other users' resources)

## 📞 Support

For issues or questions:
- Check [SECURITY.md](./SECURITY.md) for security concerns
- Review Firebase Functions logs: `firebase functions:log`
- Check Firestore data for consistency

## 📄 License

Proprietary - Verifix Platform

---

**Built with ❤️ for Nigerian artisans and their clients**
