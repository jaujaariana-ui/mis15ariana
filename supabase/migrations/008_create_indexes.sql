-- Create indexes for performance
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);

CREATE INDEX idx_guest_profiles_event ON guest_profiles(event_id);
CREATE INDEX idx_guest_profiles_auth ON guest_profiles(auth_user_id);

CREATE INDEX idx_photos_event ON photos(event_id);
CREATE INDEX idx_photos_guest ON photos(guest_id);
CREATE INDEX idx_photos_status ON photos(status);
CREATE INDEX idx_photos_created ON photos(created_at DESC);

CREATE INDEX idx_rate_limits_key ON rate_limits(ip_hash, action, window_start);
