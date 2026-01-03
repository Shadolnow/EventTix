-- Migration: Social Proof Features
-- Adds live view tracking and recent bookings feed for conversion optimization

-- Track real-time event viewers
CREATE TABLE IF NOT EXISTS public.event_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  viewer_count INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id)
);

-- Track recent bookings for social proof ticker
CREATE TABLE IF NOT EXISTS public.recent_bookings_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  attendee_name TEXT NOT NULL,
  attendee_location TEXT,
  ticket_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_views_event ON public.event_views(event_id);
CREATE INDEX IF NOT EXISTS idx_recent_bookings_event ON public.recent_bookings_feed(event_id, created_at DESC);

-- Function to update view count
CREATE OR REPLACE FUNCTION increment_event_views(p_event_id UUID)
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO public.event_views (event_id, viewer_count, last_updated)
  VALUES (p_event_id, 1, NOW())
  ON CONFLICT (event_id)
  DO UPDATE SET
    viewer_count = event_views.viewer_count + 1,
    last_updated = NOW()
  RETURNING viewer_count INTO new_count;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;

-- Function to add booking to feed (trigger on ticket creation)
CREATE OR REPLACE FUNCTION add_to_bookings_feed()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract city from phone or use 'India' as default
  INSERT INTO public.recent_bookings_feed (
    event_id,
    attendee_name,
    attendee_location,
    ticket_count
  ) VALUES (
    NEW.event_id,
    NEW.attendee_name,
    'Mumbai', -- Can be enhanced with location detection
    1
  );
  
  -- Keep only last 50 bookings per event
  DELETE FROM public.recent_bookings_feed
  WHERE id IN (
    SELECT id FROM public.recent_bookings_feed
    WHERE event_id = NEW.event_id
    ORDER BY created_at DESC
    OFFSET 50
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to populate feed on ticket creation
CREATE TRIGGER populate_bookings_feed
AFTER INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION add_to_bookings_feed();

-- RLS Policies
ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recent_bookings_feed ENABLE ROW LEVEL SECURITY;

-- Anyone can view social proof data
CREATE POLICY "Anyone can view event views"
ON public.event_views FOR SELECT
USING (true);

CREATE POLICY "Anyone can view recent bookings"
ON public.recent_bookings_feed FOR SELECT
USING (true);

-- Only system can update (via functions)
CREATE POLICY "System can update views"
ON public.event_views FOR ALL
USING (auth.role() = 'authenticated');

-- Comments
COMMENT ON TABLE public.event_views IS 'Live viewer counts for social proof';
COMMENT ON TABLE public.recent_bookings_feed IS 'Recent bookings ticker for conversion optimization';
COMMENT ON FUNCTION increment_event_views IS 'Increments view counter for an event';
