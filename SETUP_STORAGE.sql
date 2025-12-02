-- STORAGE SETUP FOR EVENT IMAGES
-- Run this AFTER the main database setup

-- Create storage bucket for event images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for event images
DROP POLICY IF EXISTS "Anyone can view event images" ON storage.objects;
CREATE POLICY "Anyone can view event images"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-images');

DROP POLICY IF EXISTS "Authenticated users can upload event images" ON storage.objects;
CREATE POLICY "Authenticated users can upload event images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'event-images' 
  AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Users can update their own event images" ON storage.objects;
CREATE POLICY "Users can update their own event images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete their own event images" ON storage.objects;
CREATE POLICY "Users can delete their own event images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'event-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
