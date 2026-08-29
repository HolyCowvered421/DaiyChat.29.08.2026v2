-- Lock search_path on update_updated_at_column to prevent search_path injection
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke EXECUTE on handle_new_user from anon and authenticated
-- This function is only meant to be called by the auth trigger, not via the API
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;