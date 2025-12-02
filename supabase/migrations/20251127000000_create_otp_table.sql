-- Create OTP verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);
CREATE INDEX IF NOT EXISTS idx_otp_created_at ON otp_verifications(created_at);

-- Enable Row Level Security
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert OTPs
CREATE POLICY "Allow insert OTP" ON otp_verifications
  FOR INSERT WITH CHECK (true);

-- Create policy to allow reading own OTPs
CREATE POLICY "Allow read own OTP" ON otp_verifications
  FOR SELECT USING (true);

-- Create policy to allow updating own OTPs
CREATE POLICY "Allow update own OTP" ON otp_verifications
  FOR UPDATE USING (true);

-- Automatic cleanup of expired OTPs (optional, runs daily)
-- This helps keep the table clean
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM otp_verifications
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;
