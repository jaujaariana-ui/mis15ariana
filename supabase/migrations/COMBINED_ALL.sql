-- ============================================
-- Xalt Moments - Combined Database Migrations
-- ============================================
-- Execute this entire file in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/bqckjtrjtctwhjvfasxj/sql/new
--
-- Generated on: 2026-11-17
-- ============================================

-- ============================================
-- 001_create_organizers.sql
-- ============================================

-- Create organizers table
CREATE TABLE IF NOT EXISTS organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger to create organizer profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_organizer()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organizers (auth_user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organizer();


-- ============================================
-- 002_create_events.sql
-- ============================================

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  event_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'expired')),
  max_photos_per_guest INT DEFAULT 20,
  max_file_size_mb INT DEFAULT 10,
  organizer_id UUID REFERENCES organizers(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);


-- ============================================
-- 003_create_event_admins.sql
-- ============================================

-- Create event_admins table for co-organizers
CREATE TABLE IF NOT EXISTS event_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES organizers(id) NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'moderator')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, user_id)
);


-- ============================================
-- 004_create_guest_profiles.sql
-- ============================================

-- Create guest_profiles table
CREATE TABLE IF NOT EXISTS guest_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) NOT NULL,
  display_name TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  is_blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);


-- ============================================
-- 005_create_photos.sql
-- ============================================

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES guest_profiles(id) ON DELETE SET NULL NOT NULL,
  storage_key TEXT NOT NULL,
  original_filename TEXT,
  mime_type TEXT NOT NULL,
  file_size INT NOT NULL,
  width INT,
  height INT,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploading', 'uploaded', 'processing', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable Realtime for photos
ALTER PUBLICATION supabase_realtime ADD TABLE photos;


-- ============================================
-- 006_create_rate_limits.sql
-- ============================================

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guest_profiles(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  count INT DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT now(),
  window_end TIMESTAMPTZ NOT NULL
);


-- ============================================
-- 007_enable_rls_policies.sql
-- ============================================

-- Enable Row Level Security on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;

-- EVENTS: solo el organizador o admins pueden leer/modificar
DO $$ BEGIN
  CREATE POLICY "Organizers can view their events"
    ON events FOR SELECT
    USING (organizer_id = auth.uid() OR
           EXISTS (SELECT 1 FROM event_admins ea WHERE ea.event_id = events.id AND ea.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Organizers can insert events"
    ON events FOR INSERT
    WITH CHECK (organizer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Organizers can update their events"
    ON events FOR UPDATE
    USING (organizer_id = auth.uid() OR
           EXISTS (SELECT 1 FROM event_admins ea WHERE ea.event_id = events.id AND ea.user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Organizers can delete their events"
    ON events FOR DELETE
    USING (organizer_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Public can view active events by slug"
    ON events FOR SELECT
    USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- GUEST_PROFILES
DO $$ BEGIN
  CREATE POLICY "Guests can view their profile"
    ON guest_profiles FOR SELECT
    USING (auth_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Guests can create their profile"
    ON guest_profiles FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view all guest profiles"
    ON guest_profiles FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = guest_profiles.event_id
      AND (e.organizer_id = auth.uid() OR
           EXISTS (SELECT 1 FROM event_admins ea WHERE ea.event_id = e.id AND ea.user_id = auth.uid()))
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update guest profiles"
    ON guest_profiles FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = guest_profiles.event_id
      AND (e.organizer_id = auth.uid() OR
           EXISTS (SELECT 1 FROM event_admins ea WHERE ea.event_id = e.id AND ea.user_id = auth.uid()))
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PHOTOS
DO $$ BEGIN
  CREATE POLICY "Anyone can view photos of an event"
    ON photos FOR SELECT
    USING (deleted_at IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Guests can upload photos"
    ON photos FOR INSERT
    WITH CHECK (guest_id IN (SELECT id FROM guest_profiles WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Guests can delete their own photos"
    ON photos FOR DELETE
    USING (guest_id IN (SELECT id FROM guest_profiles WHERE auth_user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete any photo"
    ON photos FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM events e
      JOIN event_admins ea ON ea.event_id = e.id
      WHERE e.id = photos.event_id
      AND ea.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = photos.event_id
      AND e.organizer_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- EVENT_ADMINS
DO $$ BEGIN
  CREATE POLICY "Organizers can manage event admins"
    ON event_admins FOR ALL
    USING (EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_admins.event_id
      AND e.organizer_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ORGANIZERS
DO $$ BEGIN
  CREATE POLICY "Users can view their own organizer profile"
    ON organizers FOR SELECT
    USING (auth_user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================
-- 008_create_indexes.sql
-- ============================================

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

CREATE INDEX IF NOT EXISTS idx_guest_profiles_event ON guest_profiles(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_profiles_auth ON guest_profiles(auth_user_id);

CREATE INDEX IF NOT EXISTS idx_photos_event ON photos(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_guest ON photos(guest_id);
CREATE INDEX IF NOT EXISTS idx_photos_status ON photos(status);
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(ip_hash, action, window_start);
