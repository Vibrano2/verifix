# Adding @kratos1258 as Collaborator

## 🤝 **Add Collaborator to GitHub Repository**

### Step 1: Go to Repository Settings

Visit: https://github.com/Vibrano2/verifix/settings/access

### Step 2: Invite @kratos1258

1. Click **"Add people"** button
2. Enter: `kratos1258`
3. Select **@kratos1258** from the dropdown
4. Choose permission level:
   - **Write** - Can push to repository
   - **Admin** - Full access including settings
5. Click **"Add [username] to this repository"**

### Step 3: @kratos1258 Accepts Invitation

@kratos1258 will receive:
- Email notification
- GitHub notification

They need to:
1. Check their email or GitHub notifications
2. Click **"Accept invitation"**
3. They'll have access to the repository

---

## 👨‍💻 **For @kratos1258: Getting Started**

### Clone the Repository

```bash
git clone https://github.com/Vibrano2/verifix.git
cd verifix
```

### Install Dependencies

```bash
cd functions
npm install
```

### Set Up Environment

Create `functions/.env`:

```env
PAYSTACK_SECRET_KEY=sk_test_your_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_key_here
ADMIN_UID=will_set_later
FIREBASE_PROJECT_ID=thematic-grin-482015-a3
```

### Build the Project

```bash
npm run build
```

### Deploy to Firebase

```bash
cd ..
firebase login
firebase use thematic-grin-482015-a3
firebase deploy
```

---

## 🔄 **Collaboration Workflow**

### Making Changes

```bash
# 1. Pull latest changes
git pull origin main

# 2. Create a new branch for your feature
git checkout -b feature/your-feature-name

# 3. Make your changes
# ... edit files ...

# 4. Commit changes
git add .
git commit -m "Description of changes"

# 5. Push to GitHub
git push origin feature/your-feature-name

# 6. Create Pull Request on GitHub
```

### Review and Merge

1. Go to: https://github.com/Vibrano2/verifix/pulls
2. Click **"New pull request"**
3. Select your branch
4. Add description
5. Request review
6. After approval, click **"Merge pull request"**

---

## 📁 **Project Structure**

```
verifix/
├── functions/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts          # Authentication endpoints
│   │   │   ├── artisan.ts       # Artisan management
│   │   │   ├── job.ts           # Jobs & matching
│   │   │   ├── payment.ts       # Paystack integration
│   │   │   └── admin.ts         # Admin functions
│   │   ├── middleware/
│   │   │   ├── auth.ts          # Auth & IDOR protection
│   │   │   └── validation.ts    # Input validation
│   │   ├── utils/
│   │   │   ├── paystack.ts      # Payment helpers
│   │   │   └── fileUpload.ts    # File validation
│   │   └── types/
│   │       └── index.ts         # TypeScript types
│   ├── package.json
│   └── tsconfig.json
├── firestore.rules               # Database security
├── firestore.indexes.json        # Query indexes
├── firebase.json                 # Firebase config
└── README.md                     # Documentation
```

---

## 🎯 **Key Files to Understand**

### Entry Point
- `functions/src/index.ts` - Main Express app, registers all routes

### API Routes
- `routes/auth.ts` - OTP authentication (3 endpoints)
- `routes/artisan.ts` - Artisan management (7 endpoints)
- `routes/job.ts` - Job posting & matching (8 endpoints)
- `routes/payment.ts` - Paystack integration (4 endpoints)
- `routes/admin.ts` - Admin verification (4 endpoints)

### Security
- `middleware/auth.ts` - Authentication, IDOR protection, admin checks
- `middleware/validation.ts` - Input validation with locked enums
- `utils/fileUpload.ts` - File signature validation

### Configuration
- `firestore.rules` - Database security rules
- `firestore.indexes.json` - Composite indexes for queries

---

## 📊 **API Endpoints Overview**

Base URL: `https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api`

### Authentication (3)
- POST `/api/auth/send-otp`
- POST `/api/auth/verify-otp`
- POST `/api/auth/create-custom-token`

### Artisans (7)
- POST `/api/artisans/signup`
- PATCH `/api/artisans/:uid/availability`
- POST `/api/artisans/:uid/photo`
- POST `/api/artisans/:uid/id-document`
- GET `/api/artisans/:uid`
- PATCH `/api/artisans/:uid/profile`
- GET `/api/artisans/:uid/dashboard`

### Jobs (8)
- POST `/api/jobs`
- GET `/api/jobs`
- GET `/api/jobs/:id`
- PATCH `/api/jobs/:id`
- POST `/api/jobs/:id/match`
- GET `/api/jobs/:id/matches`
- POST `/api/jobs/:id/complete`
- POST `/api/jobs/:id/rating`

### Payments (4)
- POST `/api/payments/initialize`
- POST `/api/payments/webhook`
- POST `/api/jobs/:id/reveal-contact`
- GET `/api/payments/verify/:reference`

### Admin (4)
- GET `/api/admin/verification-queue`
- POST `/api/admin/verify/:uid`
- POST `/api/admin/reject/:uid`
- GET `/api/admin/stats`

---

## 🔒 **Security Features Implemented**

✅ IDOR protection with `requireOwnership` middleware
✅ Webhook signature verification (Paystack)
✅ File upload validation (actual file signatures)
✅ Payment gate for contact reveal
✅ Admin UID from environment variable
✅ Idempotent operations (no double-release)
✅ Commission from locked_job_value
✅ Input validation with locked enums
✅ Firestore security rules
✅ Authentication required on all endpoints

---

## 🧪 **Testing**

### Run Tests Locally

```bash
# Install dependencies
cd functions
npm install

# Build
npm run build

# Test with emulator
firebase emulators:start
```

### Test Endpoints

```bash
# Health check
curl http://localhost:5001/thematic-grin-482015-a3/us-central1/api/health

# Create test user
curl -X POST http://localhost:5001/thematic-grin-482015-a3/us-central1/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+2348012345678",
    "first_name": "Test",
    "last_name": "User",
    "role": "client",
    "uid": "test_001"
  }'
```

---

## 📝 **Common Tasks**

### Add New Endpoint

1. Edit route file in `functions/src/routes/`
2. Add endpoint function
3. Export route in `functions/src/index.ts`
4. Build: `npm run build`
5. Deploy: `firebase deploy --only functions`

### Update Security Rules

1. Edit `firestore.rules`
2. Deploy: `firebase deploy --only firestore:rules`

### Add Database Index

1. Edit `firestore.indexes.json`
2. Deploy: `firebase deploy --only firestore:indexes`

---

## 🆘 **Getting Help**

### Documentation Files
- `README.md` - Full project documentation
- `SECURITY.md` - Security implementation
- `DEPLOYMENT.md` - Deployment guide
- `SETUP_COMPLETE.md` - Quick setup

### Firebase Resources
- Firebase Console: https://console.firebase.google.com/project/thematic-grin-482015-a3
- Firestore Database: https://console.firebase.google.com/project/thematic-grin-482015-a3/firestore
- Cloud Functions: https://console.firebase.google.com/project/thematic-grin-482015-a3/functions

### Logs
```bash
# View function logs
firebase functions:log

# Live tail
firebase functions:log --tail
```

---

## 🎉 **Welcome to the Team!**

You now have access to the Verifix backend codebase. The project is:

- ✅ Production-ready
- ✅ Fully documented
- ✅ Security compliant
- ✅ TypeScript typed
- ✅ Well-structured

Happy coding! 🚀
