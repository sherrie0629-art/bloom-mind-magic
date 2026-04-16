
INSERT INTO storage.buckets (id, name, public)
VALUES ('shared-posters', 'shared-posters', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view shared posters"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'shared-posters');

CREATE POLICY "Authenticated users can upload shared posters"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shared-posters');
