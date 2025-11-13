-- Update feedback insert policy to allow both 'registered' and 'attended' statuses
DROP POLICY IF EXISTS "Students can submit feedback for events they attended" ON public.event_feedback;

CREATE POLICY "Students can submit feedback for events they attended"
ON public.event_feedback
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.event_registrations
    WHERE event_id = event_feedback.event_id
    AND user_id = auth.uid()
    AND status IN ('registered', 'attended')
  )
);

