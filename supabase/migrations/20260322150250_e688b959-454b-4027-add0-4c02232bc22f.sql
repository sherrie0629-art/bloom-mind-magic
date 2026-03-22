
-- Add missing columns to daily_whispers
ALTER TABLE public.daily_whispers ADD COLUMN IF NOT EXISTS whisper text;
ALTER TABLE public.daily_whispers ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.daily_whispers ADD COLUMN IF NOT EXISTS input_text text;
ALTER TABLE public.daily_whispers ADD COLUMN IF NOT EXISTS mood_emoji text;
ALTER TABLE public.daily_whispers ADD COLUMN IF NOT EXISTS mood_word text;
ALTER TABLE public.daily_whispers ADD COLUMN IF NOT EXISTS mood_score integer;

-- Add unlocked_at to story_vault
ALTER TABLE public.story_vault ADD COLUMN IF NOT EXISTS unlocked_at timestamptz NOT NULL DEFAULT now();

-- Create compatibility_reports table
CREATE TABLE public.compatibility_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  partner_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.compatibility_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own compat reports" ON public.compatibility_reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
