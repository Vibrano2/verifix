# Deploy Verifix Backend from Google Cloud Shell

## ✅ You're Already in the Right Environment!

Your Cloud Shell session shows:
- **Project:** `thematic-grin-482015-a3` ✅
- **Node.js:** v24.18.0 ✅
- **npm:** 12.0.1 ✅

---

## 🚀 Deploy Your Verifix Backend (5 Steps)

### Step 1: Upload Your Project to Cloud Shell

You need to transfer your Verifix project files to Cloud Shell. Choose one method:

**Option A: Using Cloud Shell Editor**
1. In Cloud Shell, click **Open Editor** button
2. Upload the entire `verifix` folder using File → Upload Folder
3. Wait for upload to complete

**Option B: Using Git (if you have a repo)**
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/verifix.git
cd verifix
```

**Option C: Using gcloud storage**
```bash
# From your local machine, create a zip
cd c:\Users\USER
Compress-Archive -Path verifix -DestinationPath verifix.zip

# Upload to Cloud Storage (from local)
gsutil cp verifix.zip gs://thematic-grin-482015-a3.firebasestorage.app/

# Download in Cloud Shell
cd ~
gsutil cp gs://thematic-grin-482015-a3.firebasestorage.app/verifix.zip .
unzip verifix.zip
cd verifix
```

---

### Step 2: Set Up Environment Variables

Create the `.env` file:

```bash
cd ~/verifix/functions
cat > .env << 'EOF'
PAYSTACK_SECRET_KEY=sk_test_your_paystack_test_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
ADMIN_UID=will_set_later
FIREBASE_PROJECT_ID=thematic-grin-482015-a3
EOF
```

**Important:** Replace the Paystack keys with your actual test keys from https://dashboard.paystack.com

---

### Step 3: Install Dependencies

```bash
cd ~/verifix/functions
npm install
```

This will take 5-10 minutes. Wait for it to complete.

---

### Step 4: Build TypeScript

```bash
npm run build
```

You should see:
```
Compiled successfully
```

---

### Step 5: Deploy to Firebase

```bash
cd ~/verifix
firebase deploy
```

This deploys:
- Firestore security rules
- Firestore indexes  
- Cloud Functions (all 26 API endpoints)

---

## ✅ After Deployment

### Your API URL
```
https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api
```

### Test Health Check
```bash
curl https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"2026-08-03T..."}
```

---

## 🔧 Configure Paystack Webhook

1. Go to https://dashboard.paystack.com
2. Navigate to **Settings → Webhooks**
3. Add webhook URL:
   ```
   https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/payments/webhook
   ```
4. Enable event: **charge.success**
5. Save

---

## 👤 Create Admin User

### Step 1: Create custom token

```bash
curl -X POST https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/auth/create-custom-token \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678"}'
```

Copy the `uid` from the response.

### Step 2: Update environment

```bash
cd ~/verifix/functions
nano .env
```

Update the line:
```
ADMIN_UID=paste_your_uid_here
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### Step 3: Redeploy

```bash
cd ~/verifix
firebase deploy --only functions
```

---

## 🧪 Quick Test Commands

### Create a Test Client
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

### Check Firestore Data
```bash
# View your collections
gcloud firestore databases list
```

Or use Firebase Console:
https://console.firebase.google.com/project/thematic-grin-482015-a3/firestore

---

## 📦 Simplified Cloud Shell Script

Save this as `deploy.sh` for easy deployment:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Verifix Backend..."

cd ~/verifix/functions
echo "📦 Installing dependencies..."
npm install

echo "🔨 Building TypeScript..."
npm run build

cd ~/verifix
echo "☁️ Deploying to Firebase..."
firebase deploy

echo "✅ Deployment complete!"
echo "🌐 API URL: https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api"
```

Make executable and run:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🔍 Monitor Logs

```bash
# View function logs
firebase functions:log

# View live logs
firebase functions:log --tail

# View specific function
firebase functions:log --only api
```

---

## ✅ Success Checklist

- [ ] Project uploaded to Cloud Shell
- [ ] `.env` file created with Paystack keys
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] Firebase deployed successfully
- [ ] Health endpoint responds
- [ ] Paystack webhook configured
- [ ] Admin user created
- [ ] Test user created successfully

---

## 🎉 You're Live!

Your Verifix backend is now deployed on Firebase Cloud Functions!

**Base URL:**
```
https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api
```

**Firebase Console:**
```
https://console.firebase.google.com/project/thematic-grin-482015-a3
```

All 26 API endpoints are ready to use! 🚀
