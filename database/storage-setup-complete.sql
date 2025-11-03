-- Complete storage setup for cb-bucket
-- This script sets up the storage bucket and all necessary policies

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cb-bucket',
    'cb-bucket',
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view cb-bucket files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to cb-bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update cb-bucket files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete cb-bucket files" ON storage.objects;

-- Policy for public viewing (since bucket is public)
CREATE POLICY "Public can view cb-bucket files" ON storage.objects
    FOR SELECT USING (bucket_id = 'cb-bucket');

-- Policy for authenticated users to upload files
CREATE POLICY "Authenticated users can upload to cb-bucket" ON storage.objects
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        bucket_id = 'cb-bucket'
    );

-- Policy for authenticated users to update files
CREATE POLICY "Authenticated users can update cb-bucket files" ON storage.objects
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        bucket_id = 'cb-bucket'
    );

-- Policy for authenticated users to delete files
CREATE POLICY "Authenticated users can delete cb-bucket files" ON storage.objects
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        bucket_id = 'cb-bucket'
    );

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
