-- Add secure_url column to photos table to store the full Cloudinary delivery URL
ALTER TABLE photos ADD COLUMN IF NOT EXISTS secure_url TEXT;
