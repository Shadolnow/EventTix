-- Fix ticket claiming for authenticated users
-- The existing "Public can claim free event tickets" policy only works for anon users
-- We need to ensure authenticated users can also claim free tickets

DROP POLICY IF EXISTS "Public can claim free event tickets" ON public.tickets;

-- Recreate the policy to work for all users (both authenticated and anon)
CREATE POLICY "Anyone can claim free event tickets"
  ON public.tickets 
  FOR INSERT
  TO public, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id 
      AND events.is_free = true
    )
    OR EXISTS (
      SELECT 1 FROM events
      WHERE events.id = tickets.event_id 
      AND events.user_id = auth.uid()
    )
  );