-- Create events table
CREATE TABLE events (
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
