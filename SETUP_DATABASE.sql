-- EventTix Database Setup
-- Run in Supabase SQL Editor

-- Create events table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  venue TEXT NOT NULL,
  promotion_text TEXT,
  image_url TEXT,
  is_free boolean NOT NULL DEFAULT true,
  ticket_price decimal(10,2) DEFAULT 0.00,
  currency text DEFAULT 'INR',
  tickets_issued INTEGER NOT NULL DEFAULT 0,
  capacity integer,
  category text DEFAULT 'general',
  tags text[] DEFAULT '{}',
  gallery_images text[] DEFAULT '{}',
  faq jsonb DEFAULT '[]',
  schedule jsonb DEFAULT '[]',
  sponsors jsonb DEFAULT '[]',
  additional_info text,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT check_capacity_positive CHECK (capacity IS NULL OR capacity > 0)
);

-- Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_code TEXT NOT NULL UNIQUE,
  attendee_name TEXT NOT NULL,
  attendee_email TEXT NOT NULL,
  attendee_phone text,
  is_validated BOOLEAN NOT NULL DEFAULT false,
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  account_type TEXT NOT NULL CHECK (account_type IN ('individual', 'company')),
  company_name TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'paid')) DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tickets_phone ON public.tickets(attendee_phone);
CREATE INDEX IF NOT EXISTS idx_events_is_free ON public.events(is_free);
CREATE INDEX IF NOT EXISTS idx_events_search ON public.events USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || venue));
CREATE INDEX IF NOT EXISTS idx_events_category ON public.events(category);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);

-- Function: update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, account_type, company_name, plan_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'individual'),
    NEW.raw_user_meta_data->>'company_name',
    COALESCE(NEW.raw_user_meta_data->>'plan_type', 'free')
  );
  RETURN NEW;
END;
$$;

-- Function: increment ticket count
CREATE OR REPLACE FUNCTION public.increment_ticket_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events
  SET tickets_issued = tickets_issued + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$;

-- Function: check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function: get ticket by code
CREATE OR REPLACE FUNCTION public.get_ticket_by_code(ticket_code_input TEXT)
RETURNS TABLE (
  id UUID,
  ticket_code TEXT,
  attendee_name TEXT,
  attendee_email TEXT,
  attendee_phone TEXT,
  is_validated BOOLEAN,
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  event_id UUID,
  event_title TEXT,
  event_venue TEXT,
  event_date TIMESTAMPTZ,
  event_promotion_text TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id, t.ticket_code, t.attendee_name, t.attendee_email, t.attendee_phone,
    t.is_validated, t.validated_at, t.created_at,
    e.id as event_id, e.title as event_title, e.venue as event_venue,
    e.event_date, e.promotion_text as event_promotion_text
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.ticket_code = ticket_code_input
  LIMIT 1;
$$;

-- Function: check ticket availability
CREATE OR REPLACE FUNCTION public.check_ticket_availability(event_id_input uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    CASE 
      WHEN e.capacity IS NULL THEN true
      ELSE e.tickets_issued < e.capacity
    END
  FROM public.events e
  WHERE e.id = event_id_input;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_ticket_created ON public.tickets;
CREATE TRIGGER on_ticket_created
  AFTER INSERT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_ticket_count();

-- RLS Policies for events
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own events" ON public.events;
CREATE POLICY "Users can create their own events" ON public.events FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
CREATE POLICY "Users can update their own events" ON public.events FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
CREATE POLICY "Users can delete their own events" ON public.events FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all events" ON public.events;
CREATE POLICY "Admins can view all events" ON public.events FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all events" ON public.events;
CREATE POLICY "Admins can update all events" ON public.events FOR UPDATE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete all events" ON public.events;
CREATE POLICY "Admins can delete all events" ON public.events FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for tickets
DROP POLICY IF EXISTS "Public can claim free event tickets" ON public.tickets;
CREATE POLICY "Public can claim free event tickets" ON public.tickets FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = tickets.event_id AND events.is_free = true)
  OR EXISTS (SELECT 1 FROM public.events WHERE events.id = tickets.event_id AND events.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Event owners can view their event tickets" ON public.tickets;
CREATE POLICY "Event owners can view their event tickets" ON public.tickets FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = tickets.event_id AND events.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update tickets for their events" ON public.tickets;
CREATE POLICY "Users can update tickets for their events" ON public.tickets FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events WHERE events.id = tickets.event_id AND events.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
CREATE POLICY "Admins can view all tickets" ON public.tickets FOR SELECT USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all tickets" ON public.tickets;
CREATE POLICY "Admins can update all tickets" ON public.tickets FOR UPDATE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete all tickets" ON public.tickets;
CREATE POLICY "Admins can delete all tickets" ON public.tickets FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
);

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_ticket_availability TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_ticket_by_code TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated, anon;
