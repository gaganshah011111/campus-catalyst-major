# How to Apply the Feedback Policy Update

The feedback submission is failing because the database RLS (Row Level Security) policy only allows users with `status = 'registered'` to submit feedback, but we now also allow users with `status = 'attended'`.

## Quick Fix: Run this SQL in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. Copy and paste this SQL:

```sql
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
```

6. Click **Run** (or press Ctrl+Enter)
7. You should see "Success. No rows returned"

## Verify the Policy

After running the SQL, you can verify it worked by:

1. Go to **Database** → **Policies** in Supabase Dashboard
2. Find the `event_feedback` table
3. Look for the policy "Students can submit feedback for events they attended"
4. The policy should now allow both 'registered' and 'attended' statuses

## Alternative: Using Supabase CLI

If you have Supabase CLI set up locally:

```bash
supabase db push
```

This will apply all pending migrations including the feedback policy update.

