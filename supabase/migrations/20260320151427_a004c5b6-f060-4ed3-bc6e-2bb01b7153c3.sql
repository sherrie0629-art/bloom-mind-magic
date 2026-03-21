
-- Add energy_bits to agent_bonds
ALTER TABLE public.agent_bonds ADD COLUMN energy_bits integer NOT NULL DEFAULT 0;

-- Create story_vault table
CREATE TABLE public.story_vault (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  type text NOT NULL, -- lore, quote, truth_shard
  title text NOT NULL,
  content text NOT NULL,
  icon text NOT NULL DEFAULT '✨',
  unlocked_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.story_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own vault items"
  ON public.story_vault FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vault items"
  ON public.story_vault FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create achievements table
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id text NOT NULL,
  agent_id text,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own achievements"
  ON public.achievements FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.achievements FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
