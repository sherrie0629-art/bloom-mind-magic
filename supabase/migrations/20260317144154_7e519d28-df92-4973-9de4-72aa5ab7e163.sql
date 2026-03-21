
CREATE TABLE public.agent_bonds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  agent_id TEXT NOT NULL,
  bond_level INT NOT NULL DEFAULT 1,
  total_turns INT NOT NULL DEFAULT 0,
  unlocked_stories JSONB NOT NULL DEFAULT '[]'::jsonb,
  easter_eggs_found JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, agent_id)
);

ALTER TABLE public.agent_bonds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bonds"
ON public.agent_bonds FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bonds"
ON public.agent_bonds FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bonds"
ON public.agent_bonds FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
