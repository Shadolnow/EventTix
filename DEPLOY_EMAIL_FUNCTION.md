# Deploy Email Function - Quick Commands

## You've Already Done:
✅ Added RESEND_API_KEY to Supabase secrets

## Now Deploy the Function:

### Option 1: Deploy via CLI (RECOMMENDED)

Open PowerShell in your project folder and run:

```powershell
# Make sure you're in the project directory
cd c:\Users\shams\Downloads\TicketPro\global-qr-pass-42587

# Login to Supabase (if not already)
npx supabase login

# Link to your project
npx supabase link --project-ref kszyvgqhzguyiibpfpwo

# Deploy the function
npx supabase functions deploy send-ticket-email

# Verify it's deployed
npx supabase functions list
```

### Option 2: Check if Already Deployed

The function might already be deployed! To check:

1. In the Supabase dashboard you're on now
2. Look for **"Functions"** in the left sidebar (below "Secrets")
3. You should see `send-ticket-email` listed
4. If it's there, you're done! ✅

### Option 3: Deploy Manually via Dashboard

If you prefer using the dashboard:

1. Click the green **"Deploy a new function"** button (top right)
2. Choose **"Via CLI"** tab
3. Copy this command:
   ```bash
   npx supabase functions deploy send-ticket-email
   ```
4. Run it in PowerShell in your project folder

---

## Test After Deployment

Once deployed, test by creating a ticket in your app. Check your email!

## Troubleshooting

**If command not found:**
```powershell
npm install -g supabase
supabase login
```

**If function not found:**
The function exists at: `supabase/functions/send-ticket-email/index.ts`

**Check deployment:**
```powershell
npx supabase functions list
```

You should see `send-ticket-email` in the list with status "deployed"

---

**Next:** Just run the deploy command and you're done! 🚀
