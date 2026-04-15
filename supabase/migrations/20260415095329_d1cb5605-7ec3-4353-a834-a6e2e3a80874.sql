-- Fix: Restrict whisper-images upload to user's own folder
DROP POLICY IF EXISTS "Service role can upload whisper images" ON storage.objects;

CREATE POLICY "Users can upload own whisper images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whisper-images' AND (auth.uid())::text = (storage.foldername(name))[1]);