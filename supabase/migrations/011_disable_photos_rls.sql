-- Disable RLS on photos table and replace with permissive policies.
--
-- Why: Guest users no longer have Supabase Auth accounts. They authenticate
-- via HTTP-only JWT cookies validated in the backend API routes.
-- The old RLS policies used auth.uid() to check guest identity, which
-- always returns NULL for cookie-based guests, causing INSERT and DELETE
-- to fail silently.
--
-- Security is now handled in the API layer:
--   - POST /api/photos/upload-url  → verifies guest token or organizer session
--   - POST /api/photos/upload      → verifies guest token or organizer session
--   - DELETE /api/photos/[id]      → verifies guest token or organizer session
--
-- This migration drops the old auth.uid()-based policies and replaces them
-- with simple permissive policies since the backend already enforces all rules.

-- Drop existing photo policies
DROP POLICY IF EXISTS "Anyone can view photos of an event" ON photos;
DROP POLICY IF EXISTS "Guests can upload photos" ON photos;
DROP POLICY IF EXISTS "Guests can delete their own photos" ON photos;
DROP POLICY IF EXISTS "Admins can delete any photo" ON photos;

-- Disable RLS entirely — validation is done in API routes
ALTER TABLE photos DISABLE ROW LEVEL SECURITY;
