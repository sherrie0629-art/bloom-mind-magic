
-- Make whisper-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'whisper-images';

-- Add RLS policy: users can view their own whisper images
CREATE POLICY "Users can view own whisper images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'whisper-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service role can upload (used by edge function)
CREATE POLICY "Service role can upload whisper images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whisper-images');
