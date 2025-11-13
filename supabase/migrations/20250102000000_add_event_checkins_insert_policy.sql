-- Add INSERT policy for event_checkins table
-- This allows users to create their own check-in records (via edge function)

-- Users can insert their own check-ins
CREATE POLICY "Users can insert their own check-ins"
ON public.event_checkins
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Also allow service role to insert (for edge functions)
-- Note: Edge functions using service role key bypass RLS, but this is good practice

