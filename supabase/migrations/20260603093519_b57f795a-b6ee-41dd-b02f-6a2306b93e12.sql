CREATE POLICY "Users can delete own shared posters"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'shared-posters' AND (storage.foldername(name))[1] = auth.uid()::text);