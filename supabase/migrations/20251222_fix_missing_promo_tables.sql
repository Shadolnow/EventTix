-- Promo Codes Table for Discount System
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,  -- NULL means global code
  discount_percent INTEGER CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount DECIMAL(10,2) CHECK (discount_amount >= 0),
  max_uses INTEGER,  -- NULL means unlimited
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  min_purchase DECIMAL(10,2),  -- Minimum order value to use code
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT discount_type_check CHECK (
    (discount_percent IS NOT NULL AND discount_amount IS NULL) OR
    (discount_percent IS NULL AND discount_amount IS NOT NULL)
  )
);

-- Referral Codes Table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  discount_amount DECIMAL(10,2) DEFAULT 200,  -- Amount both referrer and referee get
  total_referrals INTEGER DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Referral Tracking Table
CREATE TABLE IF NOT EXISTS referral_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  referred_user_email TEXT NOT NULL,
  ticket_id UUID REFERENCES tickets(id),
  discount_applied DECIMAL(10,2),
  referrer_earned DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_event ON promo_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_uses ENABLE ROW LEVEL SECURITY;

-- Policies for promo_codes
DO $$ BEGIN
  CREATE POLICY "Promo codes are readable by everyone" ON promo_codes
    FOR SELECT USING (is_active = true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage promo codes" ON promo_codes
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'super_admin')
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policies for referral_codes
DO $$ BEGIN
  CREATE POLICY "Users can view their own referral codes" ON referral_codes
    FOR SELECT USING (user_id = auth.uid() OR is_active = true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own referral codes" ON referral_codes
    FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Policies for referral_uses
DO $$ BEGIN
  CREATE POLICY "Users can view their referral uses" ON referral_uses
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM referral_codes 
        WHERE referral_codes.id = referral_uses.referral_code_id 
        AND referral_codes.user_id = auth.uid()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Function to increment promo code usage
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_code_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes 
  SET current_uses = current_uses + 1, updated_at = NOW()
  WHERE id = promo_code_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record referral use
CREATE OR REPLACE FUNCTION record_referral(
  p_referral_code TEXT,
  p_referred_email TEXT,
  p_ticket_id UUID,
  p_discount DECIMAL
)
RETURNS void AS $$
DECLARE
  v_referral_code_id UUID;
BEGIN
  -- Get the referral code ID
  SELECT id INTO v_referral_code_id 
  FROM referral_codes 
  WHERE code = p_referral_code AND is_active = true;
  
  IF v_referral_code_id IS NOT NULL THEN
    -- Record the referral use
    INSERT INTO referral_uses (referral_code_id, referred_user_email, ticket_id, discount_applied, referrer_earned)
    VALUES (v_referral_code_id, p_referred_email, p_ticket_id, p_discount, p_discount);
    
    -- Update referral code stats
    UPDATE referral_codes 
    SET total_referrals = total_referrals + 1,
        total_earnings = total_earnings + p_discount
    WHERE id = v_referral_code_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add some sample promo codes for testing
INSERT INTO promo_codes (code, discount_percent, max_uses, valid_until, is_active) VALUES
  ('LAUNCH10', 10, 100, NOW() + INTERVAL '30 days', true),
  ('WELCOME20', 20, 50, NOW() + INTERVAL '14 days', true),
  ('FLAT100', NULL, 25, NOW() + INTERVAL '7 days', true)
ON CONFLICT (code) DO NOTHING;

-- Update the FLAT100 code to have discount_amount
UPDATE promo_codes SET discount_amount = 100 WHERE code = 'FLAT100' AND discount_percent IS NULL;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
