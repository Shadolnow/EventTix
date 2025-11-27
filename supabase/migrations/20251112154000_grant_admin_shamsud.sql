-- Grant admin role to user with email 'shamsud.ahmed@gmail.com'
-- Idempotent: inserts only if user exists and role not already present

DO $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'shamsud.ahmed@gmail.com';

  IF uid IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;