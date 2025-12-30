# 🚀 VERCEL ENVIRONMENT VARIABLES SETUP

## ✅ Your Resend API Key is Ready!
**Key**: `re_RbDAfxBw_Ao3CovXUbc1t9pAp86jCqYAQ`

---

## 📋 STEP-BY-STEP: Add to Vercel

### 1. Go to Vercel Dashboard
🔗 **https://vercel.com/dashboard**

### 2. Select Your Project
Click on: **eent-tix** (or whatever your project is named)

### 3. Open Settings
Click: **Settings** (top navigation bar)

### 4. Navigate to Environment Variables
Click: **Environment Variables** (left sidebar)

### 5. Add These Variables (Copy & Paste)

Click **"Add New"** for each variable below:

---

#### ✉️ **For Email/OTP (CRITICAL)**

**Variable 1:**
- **Key**: `RESEND_API_KEY`
- **Value**: `re_RbDAfxBw_Ao3CovXUbc1t9pAp86jCqYAQ`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

**Variable 2:**
- **Key**: `SUPABASE_URL`
- **Value**: `https://dmksigdpcbdvyejtedju.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

**Variable 3:**
- **Key**: `SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRta3NpZ2RwY2JkdnllanRlZGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODg5MTMsImV4cCI6MjA3ODE2NDkxM30.KU4eQFj-xZJ-b-B0PBkhsqWbdQW4azxtqJXdkctCUOs`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

---

#### 🎨 **For Frontend (Required)**

**Variable 4:**
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://dmksigdpcbdvyejtedju.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

**Variable 5:**
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRta3NpZ2RwY2JkdnllanRlZGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODg5MTMsImV4cCI6MjA3ODE2NDkxM30.KU4eQFj-xZJ-b-B0PBkhsqWbdQW4azxtqJXdkctCUOs`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

**Variable 6:**
- **Key**: `VITE_PUBLIC_SITE_URL`
- **Value**: `https://eventtix-psi.vercel.app`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

---

#### 💳 **For Payments (Optional - if using Razorpay)**

**Variable 7:**
- **Key**: `VITE_RAZORPAY_KEY_ID`
- **Value**: `rzp_test_your_key_here` *(Replace with your Razorpay test key)*
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

**Variable 8:**
- **Key**: `RAZORPAY_KEY_SECRET`
- **Value**: `your_secret_key_here` *(Replace with your Razorpay secret)*
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- Click **Save**

---

## 6. Redeploy Your App

### Option A: Via Vercel Dashboard
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **···** (three dots menu)
4. Click **"Redeploy"**

### Option B: Via Git (Recommended)
```powershell
git add .
git commit -m "Add Resend API key configuration"
git push origin main
```

---

## ⏱️ Wait 1-2 Minutes
Vercel will rebuild and deploy with the new environment variables.

---

## ✅ Test Email Verification

### Once deployed:
1. Go to: **http://localhost:8080/public-events**
2. Click on any event
3. Scroll to **"Buy Ticket"** or **"Register for Free"**
4. Fill in your details:
   - Name: Your name
   - Phone: Your phone number
   - Email: **Use a REAL email you can check**
5. Click **"Verify Email & Continue"**
6. **Expected**: Toast message "✅ Verification code sent to your-email@example.com"
7. **Check your email** (including spam folder!)
8. You should receive a beautiful email with a 6-digit OTP code
9. Enter the code
10. **SUCCESS!** ✅

---

## 📧 What the Email Looks Like

```
From: EventTix <onboarding@resend.dev>
Subject: Your EventTix verification code: 123456

┌────────────────────────────────┐
│         EventTix               │
│    (Purple gradient header)    │
└────────────────────────────────┘

Your Verification Code

Enter this code to verify your email address and claim your ticket:

╔═══════════════════╗
║     123456        ║
╚═══════════════════╝

This code will expire in 10 minutes.
If you didn't request this code, please ignore this email.

© 2025 EventTix. All rights reserved.
```

---

## 🎯 Quick Copy-Paste Summary

All environment variables you need to add:

```
RESEND_API_KEY=re_RbDAfxBw_Ao3CovXUbc1t9pAp86jCqYAQ
SUPABASE_URL=https://dmksigdpcbdvyejtedju.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRta3NpZ2RwY2JkdnllanRlZGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODg5MTMsImV4cCI6MjA3ODE2NDkxM30.KU4eQFj-xZJ-b-B0PBkhsqWbdQW4azxtqJXdkctCUOs
VITE_SUPABASE_URL=https://dmksigdpcbdvyejtedju.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRta3NpZ2RwY2JkdnllanRlZGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODg5MTMsImV4cCI6MjA3ODE2NDkxM30.KU4eQFj-xZJ-b-B0PBkhsqWbdQW4azxtqJXdkctCUOs
VITE_PUBLIC_SITE_URL=https://eventtix-psi.vercel.app
```

---

## 🔍 Troubleshooting

### Email Not Received?
1. **Check SPAM folder** - Most common issue!
2. **Wait 60 seconds** - Sometimes delayed
3. **Try different email** - Gmail, Yahoo, Outlook all work
4. **Check Resend Logs**: https://resend.com/logs
5. **Verify API key is correct** in Vercel

### Still Getting "Failed to send OTP"?
1. **Wait for deployment** - Takes 1-2 minutes
2. **Hard refresh browser** - Ctrl+Shift+R
3. **Check Browser Console** - F12 → Console tab for errors
4. **Verify all 6 environment variables** are in Vercel

### Deployment Failed?
1. **Check Vercel logs** - Deployments → Click on deployment → Function Logs
2. **Verify syntax** - Make sure no typos in variable names
3. **Retry deployment** - Sometimes needs a second try

---

## ✅ Checklist

Before you start:
- [ ] Resend API key ready: `re_RbDAfxBw_Ao3CovXUbc1t9pAp86jCqYAQ`
- [ ] Logged into Vercel dashboard
- [ ] Project selected (eent-tix)

Adding variables:
- [ ] Added `RESEND_API_KEY`
- [ ] Added `SUPABASE_URL`
- [ ] Added `SUPABASE_ANON_KEY`
- [ ] Added `VITE_SUPABASE_URL`
- [ ] Added `VITE_SUPABASE_ANON_KEY`
- [ ] Added `VITE_PUBLIC_SITE_URL`
- [ ] All environments checked (Production, Preview, Development)

After adding:
- [ ] Redeployed the app
- [ ] Waited 1-2 minutes
- [ ] Tested email verification
- [ ] ✅ Email received!

---

## 🎉 Success!

Once this is working, you'll have:
- ✅ Email verification with OTP
- ✅ Beautiful branded emails
- ✅ Secure ticket claiming
- ✅ Professional user experience

---

**Need help?** Let me know if you encounter any issues! 🚀
