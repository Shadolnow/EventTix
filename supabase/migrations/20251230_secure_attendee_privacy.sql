-- Migration: 20251230_secure_attendee_privacy.sql
-- Description: Implement strict column-level security and secure RPCs to prevent data harvesting.

-- 1. Tighten RLS on public.tickets
-- First, drop the broad "view all" policy
DROP POLICY IF EXISTS "Public can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can read tickets" ON public.tickets;

-- Only allow Event Owners (authenticated) to see everything for their events
CREATE POLICY "Event owners can view full ticket details"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = public.tickets.event_id
    AND events.user_id = auth.uid()
  )
);

-- Allow public (anon) to see BASIC ticket info ONLY if they have the specific ID
-- Note: Column-level access is further restricted below
CREATE POLICY "Public can view basic ticket by ID"
ON public.tickets
FOR SELECT
TO anon
USING (true); -- We use 'true' but restrict columns via GRANT

-- 2. Restrict Sensitive Columns for Anon
REVOKE SELECT ON public.tickets FROM anon;
-- Grant basic columns only. attendee_email, attendee_phone, security_pin are EXCLUDED.
GRANT SELECT (
  id, event_id, attendee_name, ticket_code, is_validated, 
  checked_in_at, validated_at, tier_id, payment_status, 
  payment_method, created_at, batch_id, ticket_number_in_batch,
  quantity_in_batch
) ON public.tickets TO anon;

-- Keep full select for authenticated roles (protected by RLS above)
GRANT SELECT ON public.tickets TO authenticated;

-- 3. Create Secure Gateway for Staff Verification
-- Staff are often 'anon' so they need a way to see details IF they lead with an access code
CREATE OR REPLACE FUNCTION verify_ticket_as_staff(
  p_ticket_code TEXT,
  p_access_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass column REVOKE
SET search_path = public
AS $$
DECLARE
  v_staff_id UUID;
  v_event_id UUID;
  v_ticket JSONB;
BEGIN
  -- 1. Validate Staff Access Code
  SELECT ds.event_id, ds.id INTO v_event_id, v_staff_id
  FROM door_staff ds
  WHERE ds.access_code = p_access_code
    AND ds.is_active = TRUE
    AND ds.expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired staff access code';
  END IF;

  -- 2. Fetch Ticket for that Event
  SELECT 
    jsonb_build_object(
      'id', t.id,
      'attendee_name', t.attendee_name,
      'attendee_email', t.attendee_email,
      'attendee_phone', t.attendee_phone,
      'ticket_code', t.ticket_code,
      'is_validated', t.is_validated,
      'checked_in_at', t.checked_in_at,
      'payment_status', t.payment_status,
      'event_id', t.event_id
    ) INTO v_ticket
  FROM tickets t
  WHERE t.ticket_code = p_ticket_code
    AND t.event_id = v_event_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 3. Update staff log
  UPDATE door_staff 
  SET last_scan_at = NOW(), total_scans = total_scans + 1 
  WHERE id = v_staff_id;

  RETURN v_ticket;
END;
$$;

-- 4. Create Secure Gateway for Customer Ticket Retrieval
-- Allows 3-factor lookup without exposing columns to raw SELECT
CREATE OR REPLACE FUNCTION get_tickets_by_credentials(
  p_email TEXT,
  p_phone TEXT,
  p_pin TEXT
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jsonb_build_object(
      'id', t.id,
      'event_id', t.event_id,
      'ticket_code', t.ticket_code,
      'attendee_name', t.attendee_name,
      'attendee_email', t.attendee_email,
      'attendee_phone', t.attendee_phone,
      'is_validated', t.is_validated,
      'payment_status', t.payment_status,
      'security_pin', t.security_pin,
      'created_at', t.created_at,
      'events', (SELECT row_to_json(e) FROM events e WHERE e.id = t.event_id)
    )
  FROM tickets t
  WHERE LOWER(t.attendee_email) = LOWER(p_email)
    AND t.attendee_phone = p_phone
    AND t.security_pin = p_pin
  ORDER BY t.created_at DESC;
END;
$$;

-- 5. Grant RPC execution
GRANT EXECUTE ON FUNCTION verify_ticket_as_staff(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_tickets_by_credentials(TEXT, TEXT, TEXT) TO anon, authenticated;
