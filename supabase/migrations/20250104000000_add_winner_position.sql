-- Add winner_position column to event_registrations table
-- This allows organizers to assign 1st, 2nd, 3rd place winners
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS winner_position INTEGER CHECK (winner_position IN (1, 2, 3));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_winner_position 
ON event_registrations(winner_position) 
WHERE winner_position IS NOT NULL;

-- Create index for event_id and winner_position combination
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_winner 
ON event_registrations(event_id, winner_position) 
WHERE winner_position IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN event_registrations.winner_position IS 'Winner position: 1 for 1st place, 2 for 2nd place, 3 for 3rd place';

