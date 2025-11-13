# Supabase Storage Setup for Profile Photos

To enable profile photo uploads for event registrations, you need to set up a storage bucket in Supabase:

## Steps:

1. Go to your Supabase Dashboard
2. Navigate to **Storage** section
3. Click **New bucket**
4. Create a bucket named: `event-registrations`
5. Set it as **Public bucket** (so photos can be accessed via URL)
6. Configure bucket policies:
   - **INSERT**: Allow authenticated users to upload
   - **SELECT**: Allow public read access
   - **UPDATE/DELETE**: Only allow authenticated users (optional)

## Alternative: Using Base64 Data URLs

If you don't want to set up storage, the form will fall back to using base64 data URLs stored directly in the database. However, this is less efficient for large images.

## Database Migration

Run the migration file to add the `profile_photo_url` column:
```sql
-- Already included in: supabase/migrations/20250101000000_add_profile_photo_to_registrations.sql
```

