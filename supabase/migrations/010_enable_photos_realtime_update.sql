-- Enable Realtime UPDATE events for photos table
-- This is required for soft deletes (deleted_at column updates) to propagate
-- in real-time to all connected clients viewing the gallery.
--
-- First remove the table from the publication, then re-add it with all event types
-- including UPDATE (which is not enabled by default).

ALTER PUBLICATION supabase_realtime
  REMOVE TABLE photos;

ALTER PUBLICATION supabase_realtime
  ADD TABLE photos;
