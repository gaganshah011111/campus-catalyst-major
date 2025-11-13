-- Create participants table
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  event_id BIGINT NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  year TEXT NOT NULL,
  branch TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email, event_id) -- Unique email per event
);

-- Enable RLS
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- Create indexes for search optimization
CREATE INDEX idx_participants_name ON public.participants USING gin(name gin_trgm_ops);
CREATE INDEX idx_participants_email ON public.participants USING gin(email gin_trgm_ops);
CREATE INDEX idx_participants_event_id ON public.participants(event_id);
CREATE INDEX idx_participants_branch ON public.participants(branch);
CREATE INDEX idx_participants_year ON public.participants(year);
CREATE INDEX idx_participants_created_at ON public.participants(created_at);

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- RLS Policies
-- Organizers can view participants of their own events
CREATE POLICY "Organizers can view their event participants" 
ON public.participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = participants.event_id 
    AND e.organizer_id = auth.uid()
  )
);

-- Admins can view all participants
CREATE POLICY "Admins can view all participants" 
ON public.participants 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Organizers can insert participants for their events
CREATE POLICY "Organizers can add participants to their events" 
ON public.participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = participants.event_id 
    AND e.organizer_id = auth.uid()
  )
);

-- Admins can insert participants for any event
CREATE POLICY "Admins can add participants to any event" 
ON public.participants 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Organizers can update participants in their events
CREATE POLICY "Organizers can update their event participants" 
ON public.participants 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = participants.event_id 
    AND e.organizer_id = auth.uid()
  )
);

-- Admins can update any participants
CREATE POLICY "Admins can update any participants" 
ON public.participants 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Organizers can delete participants from their events
CREATE POLICY "Organizers can delete their event participants" 
ON public.participants 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.events e 
    WHERE e.id = participants.event_id 
    AND e.organizer_id = auth.uid()
  )
);

-- Admins can delete any participants
CREATE POLICY "Admins can delete any participants" 
ON public.participants 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();