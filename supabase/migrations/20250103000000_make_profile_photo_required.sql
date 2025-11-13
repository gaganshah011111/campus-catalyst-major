-- Make profile_photo_url required in event_registrations table
-- First, update any existing NULL values to a placeholder
-- This ensures existing records don't break when we add the NOT NULL constraint
UPDATE event_registrations 
SET profile_photo_url = 'https://via.placeholder.com/150?text=No+Photo' 
WHERE profile_photo_url IS NULL;

-- Add NOT NULL constraint to profile_photo_url
ALTER TABLE event_registrations 
ALTER COLUMN profile_photo_url SET NOT NULL;

-- Add a check constraint to ensure it's not empty
ALTER TABLE event_registrations 
ADD CONSTRAINT profile_photo_url_not_empty 
CHECK (profile_photo_url IS NOT NULL AND length(trim(profile_photo_url)) > 0);

