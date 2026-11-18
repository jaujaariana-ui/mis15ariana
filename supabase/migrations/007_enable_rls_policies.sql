-- Enable Row Level Security on all tables
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizers ENABLE ROW LEVEL SECURITY;

-- EVENTS: solo el organizador o admins pueden leer/modificar
CREATE POLICY "Organizers can view their events"
  ON events FOR SELECT
  USING (organizer_id = auth.uid() OR
         EXISTS (SELECT 1 FROM event_admins ea WHERE ea.event_id = events.id AND ea.user_id = auth.uid()));

CREATE POLICY "Organizers can insert events"
  ON events FOR INSERT
  WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update their events"
  ON events FOR UPDATE
  USING (organizer_id = auth.uid() OR
         EXISTS (SELECT 1 FROM event_admins ea WHERE ea.event_id = events.id AND ea.user_id = auth.uid()));

CREATE POLICY "Organizers can delete their events"
  ON events FOR DELETE
  USING (organizer_id = auth.uid());

-- Public read for event by slug (used by /e/[slug])
CREATE POLICY "Public can view active events by slug"
  ON events FOR SELECT
  USING (status = 'active' AND (expires_at IS NULL OR expires_at > now()));

-- GUEST_PROFILES
CREATE POLICY "Guests can view their profile"
  ON guest_profiles FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "Guests can create their profile"
  ON guest_profiles FOR INSERT
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Admins can view all guest profiles"
  ON guest_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = guest_profiles.event_id
    AND (e.organizer_id = auth.uid() OR
         EXISTS (SELECT 1 FROM event_admins ea WHERE ea.event_id = e.id AND ea.user_id = auth.uid()))
  ));

CREATE POLICY "Admins can update guest profiles"
  ON guest_profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = guest_profiles.event_id
    AND (e.organizer_id = auth.uid() OR
         EXISTS (SELECT 1 FROM event_admins ea WHERE ea.event_id = e.id AND ea.user_id = auth.uid()))
  ));

-- PHOTOS
CREATE POLICY "Anyone can view photos of an event"
  ON photos FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "Guests can upload photos"
  ON photos FOR INSERT
  WITH CHECK (guest_id IN (SELECT id FROM guest_profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Guests can delete their own photos"
  ON photos FOR DELETE
  USING (guest_id IN (SELECT id FROM guest_profiles WHERE auth_user_id = auth.uid()));

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

-- EVENT_ADMINS
CREATE POLICY "Organizers can manage event admins"
  ON event_admins FOR ALL
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = event_admins.event_id
    AND e.organizer_id = auth.uid()
  ));

-- ORGANIZERS
CREATE POLICY "Users can view their own organizer profile"
  ON organizers FOR SELECT
  USING (auth_user_id = auth.uid());
