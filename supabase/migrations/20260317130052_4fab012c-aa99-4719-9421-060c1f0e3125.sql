
-- Create daily_whispers table
CREATE TABLE public.daily_whispers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  input_text TEXT,
  input_image_url TEXT,
  whisper TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_whispers ENABLE ROW LEVEL SECURITY;

-- Users can view their own whispers
CREATE POLICY "Users can view their own whispers"
  ON public.daily_whispers FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own whispers
CREATE POLICY "Users can insert their own whispers"
  ON public.daily_whispers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create whisper-images storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('whisper-images', 'whisper-images', true);

-- Allow authenticated users to upload to whisper-images
CREATE POLICY "Authenticated users can upload whisper images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'whisper-images');

-- Allow public read access to whisper-images
CREATE POLICY "Public can view whisper images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'whisper-images');
