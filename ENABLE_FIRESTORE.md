# Enable Firestore API for Deployment

## ⚠️ Issue
The Firestore API needs to be enabled for your Firebase project.

## ✅ Solution - Enable Firestore

### Option 1: Using Firebase Console (Easiest)

1. Go to Firebase Console:
   ```
   https://console.firebase.google.com/project/thematic-grin-482015-a3
   ```

2. Click **"Firestore Database"** in the left menu

3. Click **"Create Database"**

4. Choose **"Production mode"** (we have security rules)

5. Select a location (e.g., **us-central** or **asia-southeast1** for Nigeria)

6. Click **"Enable"**

7. Wait 1-2 minutes for Firestore to be created

---

### Option 2: Using gcloud Command

In PowerShell or Cloud Shell:

```bash
gcloud services enable firestore.googleapis.com --project=thematic-grin-482015-a3
```

---

## 🚀 After Enabling Firestore

Once Firestore is enabled, deploy again:

```powershell
cd C:\Users\USER\verifix
firebase deploy
```

This will deploy:
- ✅ Firestore security rules
- ✅ Firestore indexes
- ✅ Cloud Functions (all 26 API endpoints)

---

## 📊 Enable Other Required APIs

You may also need to enable these:

```bash
# Cloud Functions API
gcloud services enable cloudfunctions.googleapis.com --project=thematic-grin-482015-a3

# Cloud Build API (for function deployment)
gcloud services enable cloudbuild.googleapis.com --project=thematic-grin-482015-a3

# Cloud Storage API (for file uploads)
gcloud services enable storage.googleapis.com --project=thematic-grin-482015-a3
```

---

## ✅ Verify APIs are Enabled

Check which APIs are enabled:

```bash
gcloud services list --enabled --project=thematic-grin-482015-a3
```

You should see:
- firestore.googleapis.com
- cloudfunctions.googleapis.com
- cloudbuild.googleapis.com
- storage.googleapis.com

---

## 🔄 Alternative: Deploy Functions Only First

If you want to skip Firestore deployment for now:

```powershell
firebase deploy --only functions
```

Then enable Firestore and deploy rules later:

```powershell
firebase deploy --only firestore
```

---

## ✅ Full Deployment Command

After enabling all APIs:

```powershell
cd C:\Users\USER\verifix
firebase deploy
```

Expected output:
```
✔ Deploy complete!

Project Console: https://console.firebase.google.com/project/thematic-grin-482015-a3
Function URL (api): https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api
```

---

## 🎯 Quick Steps Summary

1. **Enable Firestore:**
   - Go to Firebase Console → Firestore Database → Create Database

2. **Deploy:**
   ```powershell
   firebase deploy
   ```

3. **Test:**
   ```bash
   curl https://us-central1-thematic-grin-482015-a3.cloudfunctions.net/api/health
   ```

That's it! 🚀
