-- ============================================
-- Xalt Moments - Remover foreign key de auth_user_id en guest_profiles
-- ============================================
-- Los invitados ya no crean cuentas en Supabase Auth.
-- auth_user_id ahora es solo un UUID local sin referencia a auth.users.
-- ============================================

-- Drop the foreign key constraint
ALTER TABLE guest_profiles
  DROP CONSTRAINT IF EXISTS guest_profiles_auth_user_id_fkey;

-- Allow NULL for auth_user_id (it's now just a local identifier)
ALTER TABLE guest_profiles
  ALTER COLUMN auth_user_id DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN guest_profiles.auth_user_id IS 'Local UUID identifier for guest, no longer references auth.users';
