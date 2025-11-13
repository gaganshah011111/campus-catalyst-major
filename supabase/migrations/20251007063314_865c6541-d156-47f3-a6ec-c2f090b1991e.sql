-- Add event_id column to banners table to link banners to specific events
ALTER TABLE banners
ADD COLUMN event_id bigint REFERENCES events(id) ON DELETE SET NULL;