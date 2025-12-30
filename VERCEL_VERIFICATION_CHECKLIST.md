# ✅ Vercel Environment Variables - Verification Checklist

## 🎯 What You Added (Without Razorpay)

### ✅ Required Environment Variables:

| # | Variable Name | Value Preview | Status |
|---|---------------|---------------|--------|
| 1 | `RESEND_API_KEY` | `re_RbDAfx...` | ✅ Should be added |
| 2 | `SUPABASE_URL` | `https://dmksigdpcb...` | ✅ Should be added |
| 3 | `SUPABASE_ANON_KEY` | `eyJhbGciOiJIU...` (long token) | ✅ Should be added |
| 4 | `VITE_SUPABASE_URL` | `https://dmksigdpcb...` | ✅ Should be added |
| 5 | `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIU...` (long token) | ✅ Should be added |
| 6 | `VITE_PUBLIC_SITE_URL` | `https://eventtix-psi.vercel.app` | ✅ Should be added |

### ⏸️ Skipped (Not needed for OTP):

| # | Variable Name | Needed For | Can Add Later |
|---|---------------|------------|---------------|
| 7 | `VITE_RAZORPAY_KEY_ID` | Payment processing | ✅ Yes, when registered |
| 8 | `RAZORPAY_KEY_SECRET` | Payment processing | ✅ Yes, when registered |

---

## 🔍 Verify in Vercel Dashboard

### Check Your Configuration:
1. Go to: https://vercel.com/dashboard
2. Select: **eent-tix** project
3. Click: **Settings** → **Environment Variables**
4. You should see **6 variables** listed

### Expected View:
```
RESEND_API_KEY                 re_RbDAfx***  (Production, Preview, Development)
SUPABASE_URL                   https://d***  (Production, Preview, Development)
SUPABASE_ANON_KEY             eyJhbGci***   (Production, Preview, Development)
VITE_SUPABASE_URL             https://d***  (Production, Preview, Development)
VITE_SUPABASE_ANON_KEY        eyJhbGci***   (Production, Preview, Development)
VITE_PUBLIC_SITE_URL          https://e***  (Production, Preview, Development)
```

---

## 🚀 Have You Redeployed?

After adding environment variables, you **MUST** redeploy for changes to take effect.

### Check Deployment Status:

**Option 1: Did you click "Redeploy"?**
- Go to: **Deployments** tab
- Latest deployment should show: "Triggered via Redeploy"
- Status: ✅ Ready

**Option 2: Did you push to Git?**
- Latest commit should trigger auto-deployment
- Check deployment status

### If NOT Redeployed Yet:
1. Go to: **Deployments** tab in Vercel
2. Find **latest deployment**
3. Click **···** (three dots)
4. Click **"Redeploy"**
5. Wait 1-2 minutes

---

## ✅ What Works Now (Without Razorpay):

### ✅ Full OTP Email Verification Flow:
1. User fills registration form
2. Clicks "Verify Email & Continue"
3. ✅ OTP sent to `eventix.now@gmail.com` (testing mode)
4. User enters OTP
5. ✅ Email verified!

### ✅ Free Events:
- Complete ticket claiming
- Ticket generation
- QR code creation
- WhatsApp sharing
- Email delivery

### ⚠️ Paid Events (Limited):
- Can proceed through OTP verification
- "Pay at Venue" option ✅ **WORKS** (no Razorpay needed)
- Online payment ❌ **NEEDS RAZORPAY** (will show error)

---

## 🎯 What You Can Test Right Now:

### Test 1: Free Event OTP
1. Go to: http://localhost:8080/public-events
2. Click a **FREE event**
3. Fill form with: `eventix.now@gmail.com`
4. Click "Verify Email & Continue"
5. **Expected**: ✅ OTP email sent
6. Check inbox
7. Enter OTP
8. **Expected**: ✅ Ticket claimed!

### Test 2: Paid Event (Pay at Venue)
1. Go to: http://localhost:8080/public-events
2. Click a **PAID event**
3. Fill form with: `eventix.now@gmail.com`
4. Click "Verify Email & Continue"
5. Enter OTP
6. Click **"Pay at Venue Instead"**
7. **Expected**: ✅ Booking token generated!

### Test 3: Paid Event (Online Payment)
- Will need Razorpay keys
- Can skip for now

---

## 🔧 Common Issues & Fixes:

### Issue 1: "Failed to send OTP" Error
**Cause**: Environment variables not deployed yet
**Fix**: Redeploy in Vercel (wait 1-2 min)

### Issue 2: Email Not Received
**Cause**: Testing mode restriction
**Fix**: Use `eventix.now@gmail.com` as recipient

### Issue 3: Supabase Errors
**Cause**: VITE_ variables not set correctly
**Fix**: Double-check `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

### Issue 4: Page Not Loading
**Cause**: Frontend Supabase vars missing
**Fix**: Ensure both `VITE_` prefixed variables are added

---

## 📝 When You Get Razorpay Keys:

### Later, Add These:
1. Go to: https://dashboard.razorpay.com
2. Complete registration
3. Get test keys:
   - `VITE_RAZORPAY_KEY_ID` (starts with `rzp_test_`)
   - `RAZORPAY_KEY_SECRET` (secret key)
4. Add to Vercel Environment Variables
5. Redeploy
6. ✅ Online payments will work!

---

## ✅ Final Verification:

### Checklist:
- [ ] 6 environment variables added to Vercel
- [ ] All checked for: Production, Preview, Development
- [ ] Redeployed after adding variables
- [ ] Waited 1-2 minutes for deployment
- [ ] Ready to test!

---

## 🎯 Next Steps:

1. **Verify** all 6 variables are in Vercel
2. **Redeploy** if you haven't already
3. **Wait** 1-2 minutes
4. **Test** with `eventix.now@gmail.com`
5. **Report back** - Did it work? 🎉

---

**Everything looks good without Razorpay!** You can test OTP email verification and free events right now. 🚀

**Need me to check anything specific?** Let me know!
