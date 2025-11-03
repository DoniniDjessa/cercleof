-- Storage policies for cb-bucket
-- These policies allow authenticated users to manage files in the storage bucket

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete files" ON storage.objects;

-- Policy for uploading files
CREATE POLICY "Authenticated users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND
        bucket_id = 'cb-bucket'
    );

-- Policy for viewing files
CREATE POLICY "Authenticated users can view files" ON storage.objects
    FOR SELECT USING (
        auth.role() = 'authenticated' AND
        bucket_id = 'cb-bucket'
    );

-- Policy for updating files
CREATE POLICY "Authenticated users can update files" ON storage.objects
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        bucket_id = 'cb-bucket'
    );

-- Policy for deleting files
CREATE POLICY "Authenticated users can delete files" ON storage.objects
    FOR DELETE USING (
        auth.role() = 'authenticated' AND
        bucket_id = 'cb-bucket'
    );

-- Grant necessary permissions on storage schema
GRANT ALL ON storage.objects TO authenticated;
GRANT USAGE ON SCHEMA storage TO authenticated;
