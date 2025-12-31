-- QUICK FIX: Create event-videos storage bucket
-- Run this IMMEDIATELY in your Supabase SQL Editor

-- Create the event-videos bucket (500MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'event-videos', 
  'event-videos', 
  true,
  524288000, -- 500MB
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mpeg'],
  public = true;

-- Create policies for public viewing
DROP POLICY IF EXISTS "Anyone can view event videos" ON storage.objects;
CREATE POLICY "Anyone can view event videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-videos');

-- Create policies for authenticated uploads
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-videos' 
  AND auth.role() = 'authenticated'
);

-- Create policies for users to update their own videos
DROP POLICY IF EXISTS "Users can update their own videos" ON storage.objects;
CREATE POLICY "Users can update their own videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policies for users to delete their own videos
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-videos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Verify bucket was created
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'event-videos';
