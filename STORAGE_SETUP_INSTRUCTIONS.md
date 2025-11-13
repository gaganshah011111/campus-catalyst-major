# Supabase Storage Setup Instructions

## Quick Setup for Profile Photos

To enable profile photo uploads, you need to create a storage bucket in Supabase:

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **New bucket**
5. Enter bucket name: `event-registrations`
6. Make it **Public** (toggle the "Public bucket" switch ON)
7. Click **Create bucket**

### Step 2: Set Up Bucket Policies

After creating the bucket, set up policies:

1. Click on the `event-registrations` bucket
2. Go to **Policies** tab
3. Click **New Policy**

#### Policy 1: Allow Authenticated Users to Upload
- Policy name: `Allow authenticated uploads`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Policy definition:
```sql
(authenticated() AND bucket_id = 'event-registrations')
```

#### Policy 2: Allow Public Read Access
- Policy name: `Allow public read`
- Allowed operation: `SELECT`
- Target roles: `public`
- Policy definition:
```sql
(bucket_id = 'event-registrations')
```

### Step 3: Verify Setup

After setting up, test by:
1. Registering for an event
2. Uploading a profile photo
3. Checking if the photo appears on the ticket

## Alternative: Base64 Fallback

If you don't want to set up storage, the system will automatically use base64 data URLs as a fallback. However, this is less efficient for large images and may cause database bloat.

## Troubleshooting

### Error: "Failed to upload profile photo"
- Check if the bucket `event-registrations` exists
- Verify the bucket is set to **Public**
- Check bucket policies allow authenticated uploads
- Check browser console for detailed error messages

### Error: "No row in database"
- This usually means the registration failed because profile photo upload failed
- The system now uses base64 fallback, so registration should still work
- Check browser console for error details

