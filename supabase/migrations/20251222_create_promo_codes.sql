-- Create promo_codes table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id),
    code TEXT NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    discount_percent NUMERIC,
    discount_amount NUMERIC,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0 NOT NULL,
    min_purchase NUMERIC DEFAULT 0,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_code_per_event UNIQUE (code, event_id)
);

-- Safe Add Constraint (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promo_codes_code_key') THEN
        ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_code_key UNIQUE (code);
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Policies (Drop first to allow re-run)
DROP POLICY IF EXISTS "Users can manage their own promo codes" ON public.promo_codes;
CREATE POLICY "Users can manage their own promo codes" ON public.promo_codes
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can read active promo codes" ON public.promo_codes;
CREATE POLICY "Anyone can read active promo codes" ON public.promo_codes
    FOR SELECT USING (true);
