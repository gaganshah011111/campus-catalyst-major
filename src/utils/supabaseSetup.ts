
/*
This file is for reference only to set up the Supabase database schema.
You can run these SQL commands in the Supabase SQL Editor.

1. Create the events table:
```sql
CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  maxCapacity INTEGER NOT NULL DEFAULT 50,
  tags TEXT[] DEFAULT '{}',
  attendees TEXT[] DEFAULT '{}'
);
```

2. Set up Row Level Security policies to allow read access to everyone and write access 
to authenticated users only:
```sql
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users
CREATE POLICY "Allow public read access" ON events
  FOR SELECT USING (true);

-- Allow insert for authenticated users
CREATE POLICY "Allow authenticated users to insert" ON events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow update for authenticated users who created the event or are admins
CREATE POLICY "Allow creators and admins to update" ON events
  FOR UPDATE USING (
    auth.uid()::text = createdBy OR 
    auth.role() = 'service_role'
  );

-- Allow delete for authenticated users who created the event or are admins
CREATE POLICY "Allow creators and admins to delete" ON events
  FOR DELETE USING (
    auth.uid()::text = createdBy OR 
    auth.role() = 'service_role'
  );
```

After setting up these tables and policies, your Supabase backend will be ready to use with your Events app.
*/
