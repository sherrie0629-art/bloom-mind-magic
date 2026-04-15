
CREATE TABLE public.daily_tarot_draws (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  card_id integer NOT NULL,
  card_name text NOT NULL,
  is_reversed boolean NOT NULL DEFAULT false,
  interpretation text,
  action_tip text,
  energy_score integer,
  image_url text,
  draw_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_tarot_draws ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tarot draws"
ON public.daily_tarot_draws
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_daily_tarot_draws_user_date ON public.daily_tarot_draws (user_id, draw_date);
