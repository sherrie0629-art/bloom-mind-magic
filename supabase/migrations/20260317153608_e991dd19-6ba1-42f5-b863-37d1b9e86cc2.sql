
CREATE TABLE public.soul_fragments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '✨',
  color text NOT NULL DEFAULT '#6366f1',
  source_type text NOT NULL,
  source_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soul_fragments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fragments"
  ON public.soul_fragments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fragments"
  ON public.soul_fragments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
