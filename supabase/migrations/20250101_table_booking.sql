-- Migration: Add table booking support for events
-- This allows events to offer table reservations instead of individual tickets

-- Add booking_type to events table
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'ticket' CHECK (booking_type IN ('ticket', 'table'));

-- Create tables management table
CREATE TABLE IF NOT EXISTS public.event_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  table_name TEXT NOT NULL, -- e.g., "Table 1", "VIP Booth A"
  table_number INTEGER NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0), -- Number of seats
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  location TEXT, -- e.g., "Near Stage", "Window Side", "VIP Section"
  is_available BOOLEAN DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb, -- e.g., ["AC", "Window View", "Near Bar"]
  booked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booked_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, table_number)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_event_tables_event ON public.event_tables(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tables_available ON public.event_tables(event_id, is_available);

-- Table for tracking table bookings
CREATE TABLE IF NOT EXISTS public.table_bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_id UUID REFERENCES public.event_tables(id) ON DELETE CASCADE NOT NULL,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  number_of_guests INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_method TEXT CHECK (payment_method IN ('upi', 'cash', 'card', 'online')),
  payment_reference TEXT,
  special_requests TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  booking_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_table_bookings_event ON public.table_bookings(event_id);
CREATE INDEX IF NOT EXISTS idx_table_bookings_table ON public.table_bookings(table_id);
CREATE INDEX IF NOT EXISTS idx_table_bookings_code ON public.table_bookings(booking_code);

-- Function to generate unique booking code
CREATE OR REPLACE FUNCTION generate_table_booking_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_code := 'TBL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_booking_code_trigger
BEFORE INSERT ON public.table_bookings
FOR EACH ROW
WHEN (NEW.booking_code IS NULL)
EXECUTE FUNCTION generate_table_booking_code();

-- Function to mark table as booked/available
CREATE OR REPLACE FUNCTION update_table_availability()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    -- Mark table as unavailable
    UPDATE public.event_tables
    SET is_available = false,
        booked_by = NEW.user_id,
        booked_at = NOW()
    WHERE id = NEW.table_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Mark table as available again
    UPDATE public.event_tables
    SET is_available = true,
        booked_by = NULL,
        booked_at = NULL
    WHERE id = NEW.table_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER table_availability_trigger
AFTER INSERT OR UPDATE ON public.table_bookings
FOR EACH ROW
EXECUTE FUNCTION update_table_availability();

-- RLS Policies
ALTER TABLE public.event_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_bookings ENABLE ROW LEVEL SECURITY;

-- Anyone can view available tables
CREATE POLICY "Anyone can view event tables"
ON public.event_tables FOR SELECT
USING (true);

-- Event creators can manage their tables
CREATE POLICY "Event creators can manage tables"
ON public.event_tables FOR ALL
USING (
  event_id IN (
    SELECT id FROM public.events
    WHERE user_id = auth.uid()
  )
);

-- Anyone can create table bookings
CREATE POLICY "Anyone can create table bookings"
ON public.table_bookings FOR INSERT
WITH CHECK (true);

-- Users can view their own bookings
CREATE POLICY "Users can view own bookings"
ON public.table_bookings FOR SELECT
USING (user_id = auth.uid() OR customer_email = auth.jwt() ->> 'email');

-- Event creators can view all bookings for their events
CREATE POLICY "Event creators can view event bookings"
ON public.table_bookings FOR SELECT
USING (
  event_id IN (
    SELECT id FROM public.events
    WHERE user_id = auth.uid()
  )
);

-- Event creators can update bookings (cancel, etc)
CREATE POLICY "Event creators can update bookings"
ON public.table_bookings FOR UPDATE
USING (
  event_id IN (
    SELECT id FROM public.events
    WHERE user_id = auth.uid()
  )
);

-- Add comments for documentation
COMMENT ON TABLE public.event_tables IS 'Tables available for booking at events (restaurants, clubs, lounges)';
COMMENT ON TABLE public.table_bookings IS 'Table reservations made by customers';
COMMENT ON COLUMN public.events.booking_type IS 'Type of booking: ticket (individual) or table (group reservation)';
