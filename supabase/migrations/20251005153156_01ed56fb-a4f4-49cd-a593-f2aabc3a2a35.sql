-- Create feedback table
CREATE TABLE IF NOT EXISTS public.event_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id bigint NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_feedback ENABLE ROW LEVEL SECURITY;

-- Students can insert their own feedback
CREATE POLICY "Students can submit feedback for events they attended"
ON public.event_feedback
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_id = event_feedback.event_id
    AND user_id = auth.uid()
    AND status = 'registered'
  )
);

-- Students can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.event_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Organizers can view feedback for their events
CREATE POLICY "Organizers can view feedback for their events"
ON public.event_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_feedback.event_id
    AND events.organizer_id = auth.uid()
  )
);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.event_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Admins can delete feedback if needed
CREATE POLICY "Admins can delete feedback"
ON public.event_feedback
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);