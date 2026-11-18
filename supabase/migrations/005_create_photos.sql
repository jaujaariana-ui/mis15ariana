-- Create photos table
CREATE TABLE photos (
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
