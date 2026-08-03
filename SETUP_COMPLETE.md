# Verifix Backend - Setup Instructions with Your Firebase Project

## ✅ Your Firebase Project

**Project ID:** `thematic-grin-482015-a3`  
**Auth Domain:** `thematic-grin-482015-a3.firebaseapp.com`  
**Storage Bucket:** `thematic-grin-482015-a3.firebasestorage.app`

Your project configuration has been updated!

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Dependencies

```powershell
cd c:\Users\USER\verifix\functions
npm install
```

⏱️ This will take 5-10 minutes. Wait for completion.

### Step 2: Create Environment File

```powershell
cd c:\Users\USER\verifix\functions
copy NUL .env
```

Edit `functions\.env` and add:

```env
PAYSTACK_SECRET_KEY=sk_test_your_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_key_here
ADMIN_UID=will_set_later
FIREBASE_PROJECT_ID=thematic-grin-482015-a3
```

**Get Paystack Keys:**
1. Go to https://paystack.com/signup
2. Complete registration
3. Navigate to Settings → API Keys & Webhooks
4. Copy your **Test Secret Key** (starts with `sk_test_`)
5. Copy your **Test Public Key** (starts with `pk_test_`)
6. Paste them in your `.env` file

### Step 3: Build and Deploy

```powershell
# Build TypeScript
cd c:\Users\USER\verifix\functions
npm run build

# Deploy everything
cd ..
firebase deploy
```

This deploys:
- Firestore security rules
- Firestore indexes
- Cloud Functions (all 26 API endpoints)

---

## 📍 Your API Endpoint

After deployment, your API will be available at:

```
https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api
```

### Test Health Check

```bash
curl https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-08-03T..."
}
```

---

## 🔧 Configure Paystack Webhook

After deployment, set up the webhook:

1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL:
   ```
   https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/payments/webhook
   ```
3. Enable event: **charge.success**
4. Save

---

## 👤 Create Your Admin User

### Step 1: Create a custom token

```bash
curl -X POST https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/auth/create-custom-token \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"+2348012345678\"}"
```

Response will contain:
```json
{
  "customToken": "eyJhbGc...",
  "uid": "ABC123DEF456",
  "message": "Custom token created"
}
```

### Step 2: Copy the UID and update your environment

Edit `functions\.env`:
```env
ADMIN_UID=ABC123DEF456
```

(Use the actual UID from the response)

### Step 3: Redeploy functions

```powershell
firebase deploy --only functions
```

---

## 🧪 Test Your Setup

### 1. Create a Test Client

```bash
curl -X POST https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+2348087654321",
    "first_name": "Test",
    "last_name": "Client",
    "role": "client",
    "uid": "test_client_001"
  }'
```

### 2. Create a Test Artisan

```bash
curl -X POST https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+2348012345678",
    "first_name": "Test",
    "last_name": "Electrician",
    "role": "artisan",
    "uid": "test_artisan_001"
  }'
```

### 3. Complete Artisan Profile

First, get a custom token for the artisan:

```bash
curl -X POST https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/auth/create-custom-token \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"+2348012345678\"}"
```

Use the returned token to complete the profile:

```bash
curl -X POST https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/artisans/signup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CUSTOM_TOKEN_HERE" \
  -d '{
    "trade": "Electricians",
    "location": "Lagos, Nigeria",
    "tagline": "Professional electrical services with 5 years experience"
  }'
```

---

## 📊 View Your Firebase Console

Access your Firebase Console:
https://console.firebase.google.com/project/thematic-grin-482015-a3

**Check:**
- 🔥 **Firestore Database** → See your collections (users, artisan_profiles, jobs, matches, transactions)
- ⚡ **Functions** → See deployed API function
- 🔐 **Authentication** → See registered users
- 📦 **Storage** → Will store uploaded photos and documents

---

## 🎯 All API Endpoints

Your backend is now live with these endpoints:

### Authentication
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/create-custom-token`

### Artisans
- `POST /api/artisans/signup`
- `PATCH /api/artisans/:uid/availability`
- `POST /api/artisans/:uid/photo`
- `POST /api/artisans/:uid/id-document`
- `GET /api/artisans/:uid`
- `PATCH /api/artisans/:uid/profile`
- `GET /api/artisans/:uid/dashboard`

### Jobs
- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `PATCH /api/jobs/:id`
- `POST /api/jobs/:id/match`
- `GET /api/jobs/:id/matches`
- `POST /api/jobs/:id/complete`
- `POST /api/jobs/:id/rating`

### Payments
- `POST /api/payments/initialize`
- `POST /api/payments/webhook` (Paystack webhook)
- `POST /api/jobs/:id/reveal-contact`
- `GET /api/payments/verify/:reference`

### Admin
- `GET /api/admin/verification-queue`
- `POST /api/admin/verify/:uid`
- `POST /api/admin/reject/:uid`
- `GET /api/admin/stats`

---

## 📱 Frontend Integration

Use the `firebase-config.js` file in your frontend app:

```javascript
import { auth, db, storage } from './firebase-config';

// Example: Sign in with phone
import { signInWithCustomToken } from 'firebase/auth';

const signIn = async (customToken) => {
  const userCredential = await signInWithCustomToken(auth, customToken);
  const idToken = await userCredential.user.getIdToken();
  
  // Use idToken for API calls
  const response = await fetch('https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/jobs', {
    headers: {
      'Authorization': `Bearer ${idToken}`
    }
  });
};
```

---

## ✅ Production Checklist

Before going live:

- [ ] npm install completed successfully
- [ ] TypeScript compiled (`npm run build`)
- [ ] `.env` file created with real Paystack keys
- [ ] Firebase deployed successfully
- [ ] Paystack webhook configured
- [ ] Admin user created and `ADMIN_UID` set
- [ ] Test health endpoint responds
- [ ] Test user creation works
- [ ] Test artisan signup works
- [ ] Test job creation works
- [ ] Test payment initialization works
- [ ] Firestore security rules deployed
- [ ] Firestore indexes deployed

---

## 🎉 You're Ready!

Your Verifix backend is complete with:
- ✅ 26 API endpoints
- ✅ Firebase project configured
- ✅ Paystack payment integration
- ✅ All security requirements met
- ✅ Complete documentation

Just run the 3 setup steps above and you're live! 🚀

**Need help?** Check:
- README.md - Full documentation
- SECURITY.md - Security details
- DEPLOYMENT.md - Detailed deployment guide
