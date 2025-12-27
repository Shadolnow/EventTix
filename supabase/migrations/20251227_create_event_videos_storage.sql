-- Create event-videos storage bucket for local video uploads
-- Videos will be stored here and cleaned up after event_date

-- Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-videos', 'event-videos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS is already enabled on storage.objects by Supabase
-- No need to ALTER TABLE (requires superuser)

-- Policy: Anyone can view videos (public bucket)
DROP POLICY IF EXISTS "Anyone can view event videos" ON storage.objects;
CREATE POLICY "Anyone can view event videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'event-videos');

-- Policy: Authenticated users can upload videos
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own videos
DROP POLICY IF EXISTS "Users can delete their own videos" ON storage.objects;
CREATE POLICY "Users can delete their own videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-videos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create a function to cleanup videos after event date
-- This will be called by a cron job or manually
CREATE OR REPLACE FUNCTION cleanup_expired_event_videos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  video_path text;
  video_record record;
BEGIN
  -- Find events that have passed
  FOR video_record IN
    SELECT 
      e.id as event_id,
      e.user_id,
      e.event_date,
      e.videos
    FROM events e
    WHERE 
      e.event_date < NOW() - INTERVAL '7 days' -- Delete 7 days after event
      AND e.videos IS NOT NULL
      AND array_length(e.videos, 1) > 0
  LOOP
    -- Loop through each video URL
    FOR video_path IN
      SELECT unnest(video_record.videos)
    LOOP
      -- Only delete if it's a local video (not YouTube/Vimeo)
      IF video_path LIKE '%event-videos%' THEN
        BEGIN
          -- Extract file path from public URL
          -- Format: https://...supabase.co/storage/v1/object/public/event-videos/user_id/videos/event_id/filename
          DECLARE
            file_path text;
          BEGIN
            file_path := substring(video_path from 'event-videos/(.*)');
            
            -- Delete from storage
            DELETE FROM storage.objects
            WHERE bucket_id = 'event-videos'
            AND name = file_path;
            
            RAISE NOTICE 'Deleted video: %', file_path;
          EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Failed to delete video: % - Error: %', video_path, SQLERRM;
          END;
        END;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION cleanup_expired_event_videos() IS 
'Deletes local videos from storage for events that ended more than 7 days ago. 
 Only affects videos stored in event-videos bucket, not YouTube/Vimeo embeds.
 Run manually or via cron job.';
