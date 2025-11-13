-- Create site_settings table to store global platform preferences
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  support_email TEXT NOT NULL DEFAULT 'support@example.com',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Trigger to auto-update updated_at on change
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed with a single settings row
INSERT INTO public.site_settings (maintenance_mode, support_email)
VALUES (false, 'support@example.com');

-- Enable row level security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to read maintenance status so the UI can respond
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

-- Only admins may modify settings
CREATE POLICY "Admins can manage site settings"
ON public.site_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

