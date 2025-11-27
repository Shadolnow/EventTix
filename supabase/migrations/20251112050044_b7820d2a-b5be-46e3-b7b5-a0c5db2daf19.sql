-- Fix RLS policy to allow both authenticated and unauthenticated users to claim free tickets
DROP POLICY IF EXISTS "Anyone can claim free event tickets" ON public.tickets;

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
  );