-- Create promo_codes table if not exists (Basic structure)
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL,
    -- user_id and other columns handled safely below
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safe Add Columns
DO $$
BEGIN
    -- Add user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'user_id') THEN
        ALTER TABLE public.promo_codes ADD COLUMN user_id UUID DEFAULT auth.uid() REFERENCES auth.users(id);
    END IF;

    -- Add event_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'event_id') THEN
        ALTER TABLE public.promo_codes ADD COLUMN event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;
    END IF;

    -- Add discount_percent
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'discount_percent') THEN
        ALTER TABLE public.promo_codes ADD COLUMN discount_percent NUMERIC;
    END IF;

    -- Add discount_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'discount_amount') THEN
        ALTER TABLE public.promo_codes ADD COLUMN discount_amount NUMERIC;
    END IF;

    -- Add other fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'max_uses') THEN
        ALTER TABLE public.promo_codes ADD COLUMN max_uses INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'current_uses') THEN
        ALTER TABLE public.promo_codes ADD COLUMN current_uses INTEGER DEFAULT 0 NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'min_purchase') THEN
        ALTER TABLE public.promo_codes ADD COLUMN min_purchase NUMERIC DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'valid_from') THEN
        ALTER TABLE public.promo_codes ADD COLUMN valid_from TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'valid_until') THEN
        ALTER TABLE public.promo_codes ADD COLUMN valid_until TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'promo_codes' AND column_name = 'is_active') THEN
        ALTER TABLE public.promo_codes ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;


-- Safe Add Constraint (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'promo_codes_code_key') THEN
        ALTER TABLE public.promo_codes ADD CONSTRAINT promo_codes_code_key UNIQUE (code);
    END IF;
    
    -- Constraint unique_code_per_event
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_code_per_event') THEN
         ALTER TABLE public.promo_codes ADD CONSTRAINT unique_code_per_event UNIQUE (code, event_id);
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
