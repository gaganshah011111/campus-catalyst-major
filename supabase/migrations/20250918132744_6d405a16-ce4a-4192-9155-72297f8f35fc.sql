-- Update events table to match requirements
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS event_name TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS venue TEXT;

-- Update event_name from title if not set
UPDATE events SET event_name = title WHERE event_name IS NULL;
-- Update category from a default if not set
UPDATE events SET category = 'General' WHERE category IS NULL;
-- Update date from start_time if not set
UPDATE events SET date = start_time WHERE date IS NULL;
-- Update venue from location if not set
UPDATE events SET venue = location WHERE venue IS NULL;

-- Update event_registrations table to match requirements
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS participant_name TEXT,
ADD COLUMN IF NOT EXISTS roll_number TEXT,
ADD COLUMN IF NOT EXISTS class TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS year TEXT,
ADD COLUMN IF NOT EXISTS is_winner BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Create an index for better search performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_search 
ON event_registrations USING gin (
  to_tsvector('english', COALESCE(participant_name, '') || ' ' || 
                        COALESCE(roll_number, '') || ' ' || 
                        COALESCE(department, '') || ' ' || 
                        COALESCE(class, ''))
);

-- Create an index for event search
CREATE INDEX IF NOT EXISTS idx_events_search 
ON events USING gin (
  to_tsvector('english', COALESCE(event_name, '') || ' ' || 
                        COALESCE(category, ''))
);

-- Update RLS policies for event_registrations to allow admin and organizer access
DROP POLICY IF EXISTS "Enhanced admin access to event registrations" ON event_registrations;
CREATE POLICY "Enhanced admin access to event registrations" 
ON event_registrations FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ) OR
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_registrations.event_id 
    AND events.organizer_id = auth.uid()
  ) OR
  user_id = auth.uid()
);