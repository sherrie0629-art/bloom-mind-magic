
-- Create new clean tarot_draws table
CREATE TABLE public.tarot_draws (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  draw_date DATE NOT NULL DEFAULT CURRENT_DATE,
  card_id INTEGER NOT NULL,
  card_name TEXT NOT NULL,
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  interpretation TEXT,
  action_tip TEXT,
  energy_score INTEGER,
  image_path TEXT,
  image_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, draw_date)
);

-- Enable RLS
ALTER TABLE public.tarot_draws ENABLE ROW LEVEL SECURITY;

-- Users can only access their own draws
CREATE POLICY "Users can view own tarot draws"
ON public.tarot_draws FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tarot draws"
ON public.tarot_draws FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update tarot draws"
ON public.tarot_draws FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Drop legacy tables
DROP TABLE IF EXISTS public.daily_whispers;
DROP TABLE IF EXISTS public.daily_tarot_draws;
