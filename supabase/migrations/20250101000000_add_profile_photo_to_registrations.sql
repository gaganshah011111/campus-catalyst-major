-- Add profile_photo_url column to event_registrations table
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Add semester column if not exists (using class field for now, but adding explicit semester)
-- Note: We're using the 'class' field for semester, but this migration ensures compatibility
COMMENT ON COLUMN event_registrations.class IS 'Class or Semester information';

