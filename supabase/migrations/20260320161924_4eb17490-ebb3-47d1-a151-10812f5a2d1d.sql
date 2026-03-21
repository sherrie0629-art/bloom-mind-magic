CREATE TABLE public.user_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  category text NOT NULL,
  content text NOT NULL,
  emotion_tag text,
  importance integer DEFAULT 1,
  conversation_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memories" ON public.user_memories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memories" ON public.user_memories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);