CREATE TABLE public.soul_mirrors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perspectives jsonb NOT NULL,
  user_snapshot jsonb,
  poster_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.soul_mirrors TO authenticated;
GRANT ALL ON public.soul_mirrors TO service_role;
ALTER TABLE public.soul_mirrors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mirrors select" ON public.soul_mirrors FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own mirrors insert" ON public.soul_mirrors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own mirrors delete" ON public.soul_mirrors FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX soul_mirrors_user_created_idx ON public.soul_mirrors (user_id, created_at DESC);