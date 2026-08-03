# Fix Firebase Authentication Issue

## ⚠️ Issue
Your Firebase credentials have expired and need to be refreshed.

## ✅ Solution - Run These Commands

### Step 1: Re-authenticate with Firebase

```powershell
firebase login --reauth
```

This will:
1. Open your browser
2. Ask you to sign in to your Google account
3. Grant Firebase CLI permissions
4. Save new credentials

### Step 2: Link Your Firebase Project

After successful login, run:

```powershell
cd c:\Users\USER\verifix
firebase use --add
```

When prompted:
1. Select your project: **thematic-grin-482015-a3**
2. Set alias: **default** (or press Enter)

### Step 3: Verify Connection

```powershell
firebase projects:list
```

You should see `thematic-grin-482015-a3` in the list.

---

## 🔄 Alternative: Use Project ID Directly

If you still have issues, you can set the project directly:

```powershell
firebase use thematic-grin-482015-a3
```

---

## ✅ Once Authentication is Fixed

Then proceed with deployment:

```powershell
# 1. Install dependencies
cd functions
npm install

# 2. Build TypeScript
npm run build

# 3. Deploy
cd ..
firebase deploy
```

---

## 🆘 If Login Still Fails

Try clearing Firebase cache:

```powershell
# Remove Firebase cache
Remove-Item -Recurse -Force "$env:USERPROFILE\.config\firebase" -ErrorAction SilentlyContinue

# Login again
firebase login
```

---

## 📝 Common Issues

### "Project does not exist"
**Solution:** Make sure you're logged in with the Google account that owns the Firebase project.

### "Permission denied"
**Solution:** Your Google account needs Owner or Editor role in the Firebase project.

### "Command not found: firebase"
**Solution:** Install Firebase CLI:
```powershell
npm install -g firebase-tools
```

---

## ✅ Success Indicators

After `firebase login --reauth` succeeds, you should see:
```
✔ Success! Logged in as your-email@gmail.com
```

After `firebase use thematic-grin-482015-a3` succeeds, you should see:
```
Now using project thematic-grin-482015-a3
```

---

## 🚀 Next Steps After Authentication

1. ✅ Firebase authentication fixed
2. ✅ Project linked
3. → Install dependencies: `cd functions; npm install`
4. → Build TypeScript: `npm run build`
5. → Deploy: `cd ..; firebase deploy`

Check **SETUP_COMPLETE.md** for full deployment instructions.
