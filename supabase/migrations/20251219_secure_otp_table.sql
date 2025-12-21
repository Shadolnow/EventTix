-- Migration: Secure OTP Verifications Table
-- Fix: PUBLIC_DATA_EXPOSURE vulnerability
-- Date: 2025-12-19

-- Enable Row Level Security on otp_verifications table
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (clean slate)
DROP POLICY IF EXISTS "Allow service role full access to OTP" ON otp_verifications;
DROP POLICY IF EXISTS "Block all public access to OTP" ON otp_verifications;

-- Policy 1: Block ALL public access (no one can read OTPs directly)
CREATE POLICY "Block all public access to OTP"
ON otp_verifications
FOR ALL
TO public
USING (false);

-- Policy 2: Allow service role (backend API) full access
-- This allows the /api/send-otp and /api/verify-otp functions to work
CREATE POLICY "Allow service role full access to OTP"
ON otp_verifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comment explaining the security model
COMMENT ON TABLE otp_verifications IS 
'Secured table for OTP storage. Only accessible via server-side API functions (send-otp, verify-otp). 
No direct client access allowed. RLS enforced.';

-- Add index for faster OTP lookups (performance optimization)
CREATE INDEX IF NOT EXISTS idx_otp_email_verified 
ON otp_verifications(email, verified, created_at DESC);

-- Add index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_otp_expires_at 
ON otp_verifications(expires_at);
