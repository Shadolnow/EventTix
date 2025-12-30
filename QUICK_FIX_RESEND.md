# ⚡ QUICK FIX: Email OTP Not Working

## 🎯 THE PROBLEM
Error: **"Failed to send OTP. Please check your email."**

## ✅ THE FIX (5 minutes)

### 1️⃣ Get Your Resend API Key
- Go to: **https://resend.com/api-keys**
- Click **"Create API Key"**
- Copy the key (starts with `re_...`)

### 2️⃣ Add to Vercel
- Go to: **https://vercel.com/dashboard**
- Select: **eent-tix** project
- Click: **Settings** → **Environment Variables**
- Add new variable:
  - Name: `RESEND_API_KEY`
  - Value: (paste your key)
  - ✅ Check all environments (Production, Preview, Development)
- Click **"Save"**

### 3️⃣ Redeploy
- Go to: **Deployments** tab
- Click **"Redeploy"** on latest deployment
- Or push to Git:
  ```bash
  git commit --allow-empty -m "Add Resend API key"
  git push
  ```

### 4️⃣ Test (after 1-2 minutes)
- Go to your event page
- Click **"Verify Email & Continue"**
- ✅ Check your email!

---

## 🔍 Why This Happens

Your localhost proxies API calls to Vercel production:
```
localhost:8080/api/send-otp → https://eventtix-psi.vercel.app/api/send-otp
```

The API code is correct, but Vercel needs the `RESEND_API_KEY` environment variable to send emails.

---

## ✅ Expected Result

After fix:
1. Beautiful OTP email arrives in inbox
2. Enter 6-digit code
3. Email verified ✅
4. Can claim ticket or proceed to payment

---

## 📝 Full Environment Variables Checklist

Make sure these are ALL in Vercel:

**For Email (OTP)**:
- ✅ `RESEND_API_KEY`
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_ANON_KEY`

**For Frontend**:
- ✅ `VITE_SUPABASE_URL`
- ✅ `VITE_SUPABASE_ANON_KEY`
- ✅ `VITE_PUBLIC_SITE_URL`

**For Payments** (if using):
- ✅ `VITE_RAZORPAY_KEY_ID`
- ✅ `RAZORPAY_KEY_SECRET`

---

## 🆘 Still Not Working?

1. **Check Spam Folder** - OTP emails often go there
2. **Wait 60 seconds** - Sometimes delayed
3. **Check Resend Logs**: https://resend.com/logs
4. **Console Errors**: Press F12 → Console tab
5. **Let me know!** - Share the error message

---

**Need the Resend API key you provided earlier?**  
Check your previous messages or regenerate a new one at https://resend.com/api-keys

---

*This should fix it! The code is perfect, we just need that API key in Vercel.* 🚀
