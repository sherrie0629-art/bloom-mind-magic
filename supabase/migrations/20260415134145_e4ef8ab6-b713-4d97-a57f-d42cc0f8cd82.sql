
-- Clean up old policies
DROP POLICY IF EXISTS "Authenticated users can upload whisper images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view whisper images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own whisper images" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload whisper images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own whisper images" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access whisper images" ON storage.objects;

-- Create new bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('tarot-card-art', 'tarot-card-art', false)
ON CONFLICT (id) DO NOTHING;

-- Users can view own images
CREATE POLICY "Users can view own tarot card art"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tarot-card-art' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can upload to own folder
CREATE POLICY "Users can upload own tarot card art"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tarot-card-art' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Service role full access for Edge Function
CREATE POLICY "Service role full access tarot card art"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'tarot-card-art')
WITH CHECK (bucket_id = 'tarot-card-art');
