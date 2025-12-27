-- Create function to list all users for admin
CREATE OR REPLACE FUNCTION public.list_all_users_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    u.created_at
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;
