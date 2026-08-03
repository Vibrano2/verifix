# Verifix Backend Deployment Guide

Step-by-step guide to deploy the Verifix backend to Firebase.

## Prerequisites

✅ Node.js 18 installed
✅ Firebase CLI installed (`npm install -g firebase-tools`)
✅ Firebase project created
✅ Paystack account with test keys

## Step 1: Install Dependencies

```bash
cd c:\Users\USER\verifix\functions
npm install
```

Expected packages:
- firebase-admin
- firebase-functions
- express
- cors
- axios
- busboy
- TypeScript and types

## Step 2: Configure Environment Variables

### Development (.env file)

Create `functions/.env`:

```env
PAYSTACK_SECRET_KEY=sk_test_your_test_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_test_key_here
ADMIN_UID=will_set_after_first_user_created
FIREBASE_PROJECT_ID=verifix
```

### Production (Firebase Functions Config)

```bash
firebase functions:config:set \
  paystack.secret_key="sk_live_your_live_key" \
  paystack.public_key="pk_live_your_live_key" \
  admin.uid="your_admin_firebase_uid"
```

Then update code to read from config:
```typescript
const PAYSTACK_SECRET_KEY = functions.config().paystack?.secret_key || process.env.PAYSTACK_SECRET_KEY;
```

## Step 3: Build TypeScript

```bash
cd functions
npm run build
```

Verify `functions/lib/` directory is created with compiled JavaScript.

## Step 4: Deploy Firestore Rules & Indexes

```bash
# From project root
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Verify in Firebase Console:
- Firestore → Rules → Should show your rules
- Firestore → Indexes → Should show composite indexes

## Step 5: Set Up Firebase Storage

1. Go to Firebase Console → Storage
2. Click "Get Started"
3. Choose security rules:
   - Test mode for development
   - Production mode with custom rules for production

## Step 6: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This will deploy the `api` function. Deployment takes 2-5 minutes.

### Expected Output:
```
✔ functions[api(us-central1)] Successful create operation.
Function URL (api): https://us-central1-verifix.cloudfunctions.net/api
```

## Step 7: Configure Paystack Webhook

1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL:
   ```
   https://us-central1-verifix.cloudfunctions.net/api/payments/webhook
   ```
3. Enable event: `charge.success`
4. Save

## Step 8: Create Admin User

### 8.1 Create a test user via API:

```bash
curl -X POST https://us-central1-verifix.cloudfunctions.net/api/auth/create-custom-token \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678"}'
```

Response:
```json
{
  "customToken": "...",
  "uid": "ABC123...",
  "message": "Custom token created"
}
```

### 8.2 Set as Admin:

Copy the `uid` and update environment:

```bash
firebase functions:config:set admin.uid="ABC123..."
```

Or update `functions/.env`:
```env
ADMIN_UID=ABC123...
```

### 8.3 Redeploy:

```bash
firebase deploy --only functions
```

## Step 9: Test Deployment

### Health Check:
```bash
curl https://us-central1-verifix.cloudfunctions.net/api/health
```

Expected:
```json
{
  "status": "healthy",
  "timestamp": "2026-08-03T..."
}
```

### Create Test User:
```bash
curl -X POST https://us-central1-verifix.cloudfunctions.net/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+2348012345678",
    "first_name": "Test",
    "last_name": "User",
    "role": "client",
    "uid": "test123"
  }'
```

## Step 10: Verify All Endpoints

Use Postman or similar to test:

1. **Authentication:**
   - POST `/api/auth/create-custom-token`
   - POST `/api/auth/verify-otp`

2. **Jobs (with auth token):**
   - POST `/api/jobs`
   - GET `/api/jobs`

3. **Admin (with admin token):**
   - GET `/api/admin/verification-queue`

## Common Issues & Solutions

### Issue: Functions won't deploy
**Solution:**
```bash
# Check Node version
node --version  # Should be 18.x

# Clear and rebuild
rm -rf functions/lib functions/node_modules
cd functions
npm install
npm run build
firebase deploy --only functions
```

### Issue: "ADMIN_UID not set" error
**Solution:**
```bash
# Set in Firebase config
firebase functions:config:set admin.uid="your_uid_here"

# Or create .env file in functions/
echo 'ADMIN_UID=your_uid_here' > functions/.env
```

### Issue: Paystack webhook returns 401
**Solution:**
- Verify webhook URL in Paystack dashboard
- Check signature validation code
- Review Cloud Functions logs: `firebase functions:log`

### Issue: File upload fails
**Solution:**
- Check Firebase Storage is initialized
- Verify bucket permissions
- Check file size (5MB limit for photos)
- Ensure file types are JPEG/PNG/WebP

### Issue: CORS errors from frontend
**Solution:**
Update CORS config in `functions/src/index.ts`:
```typescript
app.use(cors({ 
  origin: ['https://yourdomain.com', 'http://localhost:3000']
}));
```

## Monitoring & Logs

### View Function Logs:
```bash
firebase functions:log
```

### View Specific Function:
```bash
firebase functions:log --only api
```

### Live Tail:
```bash
firebase functions:log --tail
```

## Rollback

If deployment has issues:

```bash
# View deployment history
firebase functions:list

# Rollback is not directly supported
# Instead, redeploy previous version from git:
git checkout <previous-commit>
firebase deploy --only functions
```

## Production Checklist

Before going live:

- [ ] Replace all test keys with live Paystack keys
- [ ] Set production ADMIN_UID
- [ ] Update CORS to production domain only
- [ ] Enable Firestore backups
- [ ] Set up monitoring/alerting
- [ ] Configure rate limiting
- [ ] Review and tighten Firestore security rules
- [ ] Test payment flow with real money (small amount)
- [ ] Set up custom domain (optional)
- [ ] Document API for frontend team
- [ ] Create admin dashboard access instructions

## Support

- **Firebase Console:** https://console.firebase.google.com
- **Cloud Functions Logs:** Firebase Console → Functions → Logs
- **Firestore Data:** Firebase Console → Firestore Database
- **Paystack Dashboard:** https://dashboard.paystack.com

---

**Deployment Complete! 🎉**

Your Verifix backend is now live and ready to connect clients with artisans.
