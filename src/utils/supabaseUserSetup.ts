
/*
This file is for reference only to set up the Supabase users table and authentication.
You can run these SQL commands in the Supabase SQL Editor.

1. Create the users table (this extends Supabase's auth.users table):
```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'organizer', 'admin')),
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create a trigger to automatically create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, is_approved)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'student'),
    -- Automatically approve students, but require admin approval for organizers
    CASE 
      WHEN new.raw_user_meta_data->>'role' = 'student' THEN TRUE 
      ELSE FALSE 
    END
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

2. Note: Make sure to enable email/password authentication in your Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Email provider
   - Configure password settings as needed

3. Optional: To add initial admin user, you can run this after signing up:
```sql
-- You'll need to replace 'admin@example.com' with the actual email you signed up with
UPDATE public.profiles
SET role = 'admin', is_approved = TRUE
WHERE email = 'admin@example.com';
```

After setting up these tables and triggers, your Supabase backend will be ready for user authentication and management.
*/
