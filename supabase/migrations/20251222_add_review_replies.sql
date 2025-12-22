-- Add reply functionality to reviews table
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS organizer_reply TEXT,
ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS replied_by UUID REFERENCES auth.users(id);

-- Update RLS policy to allow organizers to update their own event's reviews
DROP POLICY IF EXISTS "Event organizers can reply to reviews" ON public.reviews;
CREATE POLICY "Event organizers can reply to reviews" ON public.reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = reviews.event_id
      AND events.user_id = auth.uid()
    )
  );
