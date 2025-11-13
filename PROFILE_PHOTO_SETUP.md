# Profile Photo Setup Guide

## Database Migration

Run the following SQL query in your Supabase SQL Editor to make `profile_photo_url` required:

```sql
-- Make profile_photo_url required in event_registrations table
-- First, update any existing NULL values to a placeholder
-- This ensures existing records don't break when we add the NOT NULL constraint
UPDATE event_registrations 
SET profile_photo_url = 'https://via.placeholder.com/150?text=No+Photo' 
WHERE profile_photo_url IS NULL;

-- Add NOT NULL constraint to profile_photo_url
ALTER TABLE event_registrations 
ALTER COLUMN profile_photo_url SET NOT NULL;

-- Add a check constraint to ensure it's not empty
ALTER TABLE event_registrations 
ADD CONSTRAINT profile_photo_url_not_empty 
CHECK (profile_photo_url IS NOT NULL AND length(trim(profile_photo_url)) > 0);
```

## Migration File

The migration file has been created at:
`supabase/migrations/20250103000000_make_profile_photo_required.sql`

## Changes Made

### 1. Database
- ✅ Added migration to make `profile_photo_url` NOT NULL
- ✅ Added constraint to ensure profile photo URL is not empty

### 2. Registration Forms
- ✅ Made profile photo required in `EventRegistrationForm.tsx`
- ✅ Made profile photo required in `EventRegistrationPage.tsx`
- ✅ Added validation error messages for missing profile photos
- ✅ Added visual indicators (red border) when profile photo is missing

### 3. Event Ticket Display
- ✅ Added profile picture display below QR code in `EventTicket.tsx`
- ✅ Profile picture is shown in a circular frame with border
- ✅ Added "Participant Photo" label below the image

### 4. Download Functionality
- ✅ Updated JPEG download to include both QR code and profile picture
- ✅ Added PDF download functionality with both QR code and profile picture
- ✅ Both downloads show the profile picture below the QR code

### 5. Dependencies
- ✅ Added `jspdf` package to `package.json` for PDF generation

## Installation Steps

1. **Install new dependency:**
   ```bash
   npm install
   ```

2. **Run the migration:**
   - Go to Supabase Dashboard → SQL Editor
   - Run the SQL query from the migration file above
   - Or use Supabase CLI: `supabase migration up`

3. **Verify the changes:**
   - Try registering for an event - profile photo should be required
   - Check the ticket page - profile photo should appear below QR code
   - Test downloading JPEG and PDF - both should include the profile photo

## Notes

- Existing registrations without profile photos will be updated with a placeholder image
- New registrations will require a profile photo upload
- Profile photos are stored in Supabase Storage bucket `event-registrations`
- Maximum file size: 5MB
- Supported formats: JPG, PNG

