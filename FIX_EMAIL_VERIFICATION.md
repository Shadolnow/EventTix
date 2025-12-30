# 🔧 Fix Email Verification (OTP) Not Working

## 🎯 Problem
The "Verify Email & Continue" button shows error: **"Failed to send OTP. Please check your email."**

## 🔍 Root Cause
Your localhost is proxying `/api` requests to **Vercel production** (`https://eventtix-psi.vercel.app`), but the **Resend API key** is not configured in Vercel's environment variables.

## ✅ Solution: Add Resend API Key to Vercel

### Step 1: Get Your Resend API Key
1. Go to [https://resend.com/dashboard](https://resend.com/dashboard)
2. Navigate to **API Keys** section
3. Copy your API key (starts with `re_...`)
   - If you don't have one, click **"Create API Key"**
   - Give it a name like "EventTix Production"
   - Copy the key immediately (you won't be able to see it again)

### Step 2: Add to Vercel Environment Variables
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your **EventTix** project (`eent-tix`)
3. Click **Settings** (top navigation)
4. Click **Environment Variables** (left sidebar)
5. Add a new variable:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Your Resend API key (paste it here)
   - **Environments**: Check ✅ **Production**, **Preview**, and **Development**
6. Click **Save**

### Step 3: Redeploy
After adding the environment variable, you need to redeploy:

**Option A: Via Vercel Dashboard**
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the **3 dots** menu
4. Click **Redeploy**

**Option B: Git Push (Recommended)**
```powershell
# Make a small change to trigger deployment
git commit --allow-empty -m "chore: redeploy to apply RESEND_API_KEY"
git push origin main
```

### Step 4: Wait & Test
1. Wait 1-2 minutes for deployment to complete
2. Go to your public event page
3. Try the **"Verify Email & Continue"** button again
4. Check your email for the OTP code!

---

## 🔐 Additional Environment Variables (If Not Already Set)

While you're in Vercel environment variables, make sure these are also configured:

### Required:
- ✅ **RESEND_API_KEY** - For sending emails (you just added this)
- ✅ **VITE_SUPABASE_URL** - Your Supabase project URL
- ✅ **VITE_SUPABASE_ANON_KEY** - Your Supabase anonymous key
- ✅ **RAZORPAY_KEY_ID** - For payment processing (if accepting paid tickets)
- ✅ **RAZORPAY_KEY_SECRET** - Razorpay secret key

### How to Check:
In Vercel Dashboard → Settings → Environment Variables, you should see all of these.

---

## 🧪 Testing After Fix

### Test on Production (via localhost proxy):
1. Open http://localhost:8080/public-events
2. Click on any event
3. Fill in the form:
   - **Name**: Your name
   - **Phone**: Valid phone number
   - **Email**: **Use a real email you can access**
4. Click **"Verify Email & Continue"**
5. **Expected**: Toast message "Verification code sent to [your-email]"
6. Check your email (including spam folder)
7. Enter the 6-digit OTP
8. **Success!** ✅

---

## 🔍 Troubleshooting

### Error: "Email service not configured"
**Cause**: `RESEND_API_KEY` is missing or incorrect
**Fix**: Double-check the key in Vercel environment variables

### Error: "Failed to send verification email"
**Possible Causes**:
1. **Invalid Resend API Key**: Verify the key is correct
2. **Resend Account Issue**: Check if your Resend account has email sending credits
3. **Email Blocked**: Some email providers block automated emails - try a different email

### OTP email not received
**Check**:
1. **Spam/Junk folder** - Check there first!
2. **Email address** - Make sure you typed it correctly
3. **Resend Dashboard**: Go to [Resend Logs](https://resend.com/logs) to see if email was sent
4. **Wait a minute**: Sometimes emails are delayed

### Still not working?
**Debug Mode**:
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try sending OTP again
4. Look for errors in console
5. Go to **Network** tab
6. Find the `/api/send-otp` request
7. Click on it → **Response** tab
8. Share the error message with me

---

## 📝 Current Configuration

Your vite.config.ts (lines 13-19):
```typescript
proxy: {
  '/api': {
    target: 'https://eventtix-psi.vercel.app',
    changeOrigin: true,
    secure: true,
  }
}
```

This means:
- ✅ Localhost calls to `/api/send-otp` → Proxied to `https://eventtix-psi.vercel.app/api/send-otp`
- ✅ API runs on Vercel serverless functions
- ⚠️ **Requires** Vercel to have `RESEND_API_KEY` configured

---

## 🚀 Quick Fix Checklist

- [ ] Get Resend API key from https://resend.com/dashboard
- [ ] Add `RESEND_API_KEY` to Vercel environment variables
- [ ] Redeploy Vercel project (or push to Git)
- [ ] Wait 1-2 minutes
- [ ] Test email verification on localhost
- [ ] Check email inbox (and spam!)
- [ ] ✅ Working!

---

## 💡 Alternative: Test with Console Logs

If you want to see what OTP is being generated (for testing):

1. Edit `api/send-otp.js` line 42
2. Add this after the OTP generation:
```javascript
console.log('🔐 Generated OTP for', email, ':', otp);
```
3. Deploy
4. Check Vercel function logs to see the OTP

**⚠️ Remove this console.log in production for security!**

---

## ✅ Expected Behavior After Fix

1. User fills form → Clicks "Verify Email & Continue"
2. Frontend sends POST to `/api/send-otp`
3. Backend generates 6-digit OTP
4. Backend saves OTP to Supabase `otp_verifications` table
5. Backend sends email via Resend
6. User receives email with styled OTP code
7. User enters OTP
8. Frontend sends POST to `/api/verify-otp`
9. Backend validates OTP
10. ✅ User can proceed to claim ticket or pay!

---

## 📧 What the Email Looks Like

When working correctly, users receive an email like:

```
From: EventTix <onboarding@resend.dev>
Subject: Your EventTix verification code: 123456

[EventTix Header with Purple Gradient]

Your Verification Code

Enter this code to verify your email address and claim your ticket:

┌─────────────────┐
│    123456       │
└─────────────────┘

This code will expire in 10 minutes.
If you didn't request this code, please ignore this email.

© 2025 EventTix. All rights reserved.
```

---

## 🎯 Summary

**Main Fix**: Add `RESEND_API_KEY` to Vercel environment variables and redeploy.

That's it! The code is already correct, we just need the API key configured on Vercel.

---

*Need help? Let me know if you see any errors after following these steps!* 🚀
