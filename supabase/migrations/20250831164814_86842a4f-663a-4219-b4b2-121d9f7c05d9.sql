-- Create banners table for dynamic home page slider management
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  link_url TEXT,
  button_text TEXT DEFAULT 'Learn More',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active banners" 
ON public.banners 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all banners" 
ON public.banners 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create trigger for updated_at
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default banners
INSERT INTO public.banners (title, description, image_url, is_active, display_order) VALUES
('Campus Sports Tournaments', 'Join exciting sports competitions throughout the year, from basketball tournaments to intramural leagues.', 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80', true, 1),
('Cultural Festivals & Performances', 'Experience the rich diversity of campus life through cultural celebrations, performances and festivals.', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80', true, 2),
('Interactive Workshops', 'Build skills and connections through hands-on workshops led by industry experts and talented peers.', 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80', true, 3),
('Academic Seminars & Conferences', 'Expand your knowledge with thought-provoking seminars and academic conferences featuring renowned speakers.', 'https://images.unsplash.com/photo-1588196749597-9ff075ee6b5b?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=80', true, 4);