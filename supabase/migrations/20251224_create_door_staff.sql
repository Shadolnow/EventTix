-- Create door_staff table for managing scanner access
CREATE TABLE IF NOT EXISTS door_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE, -- 6-digit code for quick access
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
  is_active BOOLEAN DEFAULT TRUE,
  last_scan_at TIMESTAMP WITH TIME ZONE,
  total_scans INTEGER DEFAULT 0,
  
  UNIQUE(event_id, user_email)
);

-- Indexes for fast lookups
CREATE INDEX idx_door_staff_event ON door_staff(event_id);
CREATE INDEX idx_door_staff_code ON door_staff(access_code);
CREATE INDEX idx_door_staff_email ON door_staff(user_email);
CREATE INDEX idx_door_staff_active ON door_staff(is_active, expires_at);

-- RLS Policies
ALTER TABLE door_staff ENABLE ROW LEVEL SECURITY;

-- Event owners can manage door staff
CREATE POLICY "Event owners can view door staff"
ON door_staff
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = door_staff.event_id
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Event owners can add door staff"
ON door_staff
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = door_staff.event_id
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Event owners can update door staff"
ON door_staff
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = door_staff.event_id
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Event owners can delete door staff"
ON door_staff
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = door_staff.event_id
    AND events.user_id = auth.uid()
  )
);

-- Function to generate unique access code
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-digit code
    code := LPAD((FLOOR(RANDOM() * 900000) + 100000)::TEXT, 6, '0');
    
    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM door_staff WHERE access_code = code) INTO code_exists;
    
    -- If unique, return it
    IF NOT code_exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to validate door staff access
CREATE OR REPLACE FUNCTION validate_door_staff_access(
  p_access_code TEXT,
  p_event_id UUID DEFAULT NULL
)
RETURNS TABLE(
  is_valid BOOLEAN,
  staff_id UUID,
  event_id UUID,
  user_email TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (ds.is_active AND ds.expires_at > NOW()) AS is_valid,
    ds.id AS staff_id,
    ds.event_id,
    ds.user_email,
    ds.expires_at
  FROM door_staff ds
  WHERE ds.access_code = p_access_code
    AND (p_event_id IS NULL OR ds.event_id = p_event_id);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE door_staff IS 'Manages temporary QR scanner access for door staff/volunteers';
COMMENT ON COLUMN door_staff.access_code IS '6-digit code for quick scanner access without full account';
COMMENT ON FUNCTION generate_access_code IS 'Generates unique 6-digit access code for door staff';
COMMENT ON FUNCTION validate_door_staff_access IS 'Validates door staff access code and returns permissions';
