-- Create event_checkins table for QR-based authentication
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id bigint NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  registration_id bigint NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
  qr_token text UNIQUE NOT NULL,
  is_checked_in boolean DEFAULT false,
  checked_in_at timestamp with time zone,
  checked_in_by uuid REFERENCES auth.users(id),
  issued_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Enable RLS
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;

-- Users can view their own check-ins
CREATE POLICY "Users can view their own check-ins"
ON public.event_checkins
FOR SELECT
USING (auth.uid() = user_id);

-- Organizers can view check-ins for their events
CREATE POLICY "Organizers can view check-ins for their events"
ON public.event_checkins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_checkins.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Admins can view all check-ins
CREATE POLICY "Admins can view all check-ins"
ON public.event_checkins
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Organizers and admins can update check-ins (for scanning)
CREATE POLICY "Organizers and admins can update check-ins"
ON public.event_checkins
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = event_checkins.event_id
    AND events.organizer_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_event_checkins_user_id ON public.event_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON public.event_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_qr_token ON public.event_checkins(qr_token);
CREATE INDEX IF NOT EXISTS idx_event_checkins_is_checked_in ON public.event_checkins(is_checked_in);