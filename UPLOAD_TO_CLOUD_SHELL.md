# Upload Verifix to Google Cloud Shell

## ⚠️ Issue
The `verifix` folder doesn't exist in Cloud Shell yet - you need to upload it first!

---

## ✅ **Method 1: Cloud Shell Editor (Easiest)**

### Step 1: Open Cloud Shell Editor
In your Cloud Shell window, click the **"Open Editor"** button (pencil icon) at the top right.

### Step 2: Upload the Folder
1. In the editor, go to **File → Upload Folder**
2. Navigate to `C:\Users\USER\verifix`
3. Select the entire `verifix` folder
4. Click **Upload**
5. Wait for upload to complete (may take 5-10 minutes)

### Step 3: Verify Upload
In Cloud Shell terminal:
```bash
ls ~/verifix
```

You should see:
```
firebase.json  functions  firestore.rules  README.md  ...
```

---

## ✅ **Method 2: Using Git (If You Have GitHub)**

### On Your Local Machine (Windows):

```powershell
cd C:\Users\USER\verifix

# Initialize git (if not already)
git init
git add .
git commit -m "Initial Verifix backend"

# Create GitHub repo and push
# (Follow GitHub instructions to create repo)
git remote add origin https://github.com/YOUR_USERNAME/verifix.git
git push -u origin main
```

### In Cloud Shell:

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/verifix.git
cd verifix
ls -la
```

---

## ✅ **Method 3: Using Cloud Storage Bucket**

### On Your Local Machine (PowerShell):

```powershell
# Create a zip file
cd C:\Users\USER
Compress-Archive -Path verifix -DestinationPath verifix.zip

# Upload using gsutil (install if needed)
gsutil cp verifix.zip gs://thematic-grin-482015-a3.firebasestorage.app/
```

### In Cloud Shell:

```bash
cd ~
gsutil cp gs://thematic-grin-482015-a3.firebasestorage.app/verifix.zip .
unzip verifix.zip
cd verifix
ls -la
```

---

## ✅ **Method 4: Manual File Creation (Advanced)**

If uploads are slow, create the project structure directly in Cloud Shell:

```bash
cd ~
mkdir -p verifix/functions/src/{routes,middleware,utils,types}

# Copy the files one by one using Cloud Shell editor
# Or use the script below to recreate the structure
```

---

## 🚀 **After Upload - Deploy Commands**

Once you see the files in `~/verifix`, run:

```bash
# 1. Navigate to project
cd ~/verifix

# 2. Check files are there
ls -la

# 3. Create environment file
cd functions
cat > .env << 'EOF'
PAYSTACK_SECRET_KEY=sk_test_your_paystack_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_key
ADMIN_UID=will_set_later
FIREBASE_PROJECT_ID=thematic-grin-482015-a3
EOF

# 4. Install dependencies
npm install

# 5. Build TypeScript
npm run build

# 6. Deploy
cd ~/verifix
firebase deploy
```

---

## 📋 **Verify Upload Checklist**

After upload, these commands should work:

```bash
# Should show verifix folder
ls ~/verifix

# Should show package.json
cat ~/verifix/functions/package.json

# Should show firebase.json
cat ~/verifix/firebase.json

# Should show source files
ls ~/verifix/functions/src/
```

---

## 🎯 **Recommended: Use Cloud Shell Editor**

**Easiest and most reliable method:**

1. Click **"Open Editor"** in Cloud Shell (pencil icon)
2. Click **File → Upload Folder**
3. Select `C:\Users\USER\verifix`
4. Wait for upload
5. Return to terminal and verify: `ls ~/verifix`

Then run the deployment commands!

---

## 💡 **Quick Alternative: Deploy from Windows Instead**

If upload is too slow, you can deploy directly from your Windows machine:

### On Windows PowerShell:

```powershell
cd C:\Users\USER\verifix

# Re-authenticate
firebase login --reauth

# Select your project
firebase use thematic-grin-482015-a3

# Install and deploy
cd functions
npm install
npm run build
cd ..
firebase deploy
```

This deploys from your local machine to Firebase!

---

## ✅ **Once Files Are in Cloud Shell**

You'll see this structure:
```
~/verifix/
├── functions/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── firebase.json
├── firestore.rules
└── README.md
```

Then you can run the deployment commands successfully! 🚀
