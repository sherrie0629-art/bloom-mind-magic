
-- =========================================
-- 1. Achievements: lock down + server-validated grant
-- =========================================

DROP POLICY IF EXISTS "Users can manage own achievements" ON public.achievements;

CREATE POLICY "Users can view own achievements"
ON public.achievements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Definitions table (server source of truth for unlock conditions)
CREATE TABLE IF NOT EXISTS public.achievement_defs (
  id text PRIMARY KEY,
  agent_id text,
  condition_type text NOT NULL,
  condition_agent_id text,
  threshold integer NOT NULL
);

ALTER TABLE public.achievement_defs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read achievement defs"
ON public.achievement_defs
FOR SELECT
TO authenticated, anon
USING (true);

INSERT INTO public.achievement_defs (id, agent_id, condition_type, condition_agent_id, threshold) VALUES
  ('coffee_regular',    'barista', 'total_turns',         'barista', 10),
  ('latte_soulmate',    'barista', 'bond_level',          'barista', 4),
  ('fireproof',         'jax',     'energy_bits',         'jax',     100),
  ('breakthrough',      'jax',     'total_turns',         'jax',     20),
  ('trail_companion',   'mentor',  'total_turns',         'mentor',  15),
  ('campfire_bond',     'mentor',  'bond_level',          'mentor',  3),
  ('hype_squad',        'bestie',  'total_turns',         'bestie',  10),
  ('main_character',    'bestie',  'bond_level',          'bestie',  4),
  ('first_step',        NULL,      'total_conversations', NULL,      1),
  ('soul_explorer',     NULL,      'total_conversations', NULL,      4),
  ('energy_collector',  NULL,      'energy_bits',         NULL,      300),
  ('shard_hunter',      NULL,      'truth_shards',        NULL,      5),
  ('egg_finder',        NULL,      'easter_eggs',         NULL,      2)
ON CONFLICT (id) DO UPDATE SET
  agent_id = EXCLUDED.agent_id,
  condition_type = EXCLUDED.condition_type,
  condition_agent_id = EXCLUDED.condition_agent_id,
  threshold = EXCLUDED.threshold;

CREATE OR REPLACE FUNCTION public.grant_achievement(p_achievement_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_def public.achievement_defs%ROWTYPE;
  v_met boolean := false;
  v_val integer := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN false;
  END IF;

  SELECT * INTO v_def FROM public.achievement_defs WHERE id = p_achievement_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Already unlocked?
  IF EXISTS (SELECT 1 FROM public.achievements WHERE user_id = v_user AND achievement_id = p_achievement_id) THEN
    RETURN true;
  END IF;

  IF v_def.condition_agent_id IS NOT NULL THEN
    -- Per-agent conditions
    IF v_def.condition_type = 'total_turns' THEN
      SELECT COALESCE(total_turns, 0) INTO v_val FROM public.agent_bonds
        WHERE user_id = v_user AND agent_id = v_def.condition_agent_id;
      v_met := COALESCE(v_val, 0) >= v_def.threshold;
    ELSIF v_def.condition_type = 'energy_bits' THEN
      SELECT COALESCE(energy_bits, 0) INTO v_val FROM public.agent_bonds
        WHERE user_id = v_user AND agent_id = v_def.condition_agent_id;
      v_met := COALESCE(v_val, 0) >= v_def.threshold;
    ELSIF v_def.condition_type = 'bond_level' THEN
      SELECT COALESCE(bond_level, 0) INTO v_val FROM public.agent_bonds
        WHERE user_id = v_user AND agent_id = v_def.condition_agent_id;
      v_met := COALESCE(v_val, 0) >= v_def.threshold;
    ELSIF v_def.condition_type = 'easter_eggs' THEN
      SELECT COALESCE(jsonb_array_length(easter_eggs_found), 0) INTO v_val FROM public.agent_bonds
        WHERE user_id = v_user AND agent_id = v_def.condition_agent_id;
      v_met := COALESCE(v_val, 0) >= v_def.threshold;
    END IF;
  ELSE
    -- Global conditions
    IF v_def.condition_type = 'total_conversations' THEN
      SELECT COUNT(DISTINCT agent_id) INTO v_val FROM public.conversations WHERE user_id = v_user;
      v_met := v_val >= v_def.threshold;
    ELSIF v_def.condition_type = 'energy_bits' THEN
      SELECT COALESCE(SUM(energy_bits), 0) INTO v_val FROM public.agent_bonds WHERE user_id = v_user;
      v_met := v_val >= v_def.threshold;
    ELSIF v_def.condition_type = 'truth_shards' THEN
      SELECT COUNT(*) INTO v_val FROM public.story_vault WHERE user_id = v_user AND type = 'truth_shard';
      v_met := v_val >= v_def.threshold;
    ELSIF v_def.condition_type = 'easter_eggs' THEN
      SELECT COALESCE(SUM(jsonb_array_length(easter_eggs_found)), 0) INTO v_val FROM public.agent_bonds WHERE user_id = v_user;
      v_met := v_val >= v_def.threshold;
    END IF;
  END IF;

  IF v_met THEN
    INSERT INTO public.achievements (user_id, achievement_id, agent_id)
    VALUES (v_user, p_achievement_id, v_def.agent_id)
    ON CONFLICT DO NOTHING;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_achievement(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_achievement(text) TO authenticated;

-- =========================================
-- 2. Usage tracking: SELECT + INSERT only for users
-- =========================================

DROP POLICY IF EXISTS "Users can manage own usage" ON public.usage_tracking;

CREATE POLICY "Users can view own usage"
ON public.usage_tracking
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage row"
ON public.usage_tracking
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- =========================================
-- 3. Storage: shared-posters owner-scoped upload
-- =========================================

DROP POLICY IF EXISTS "Authenticated users can upload shared posters" ON storage.objects;

CREATE POLICY "Users can upload own shared posters"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shared-posters'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =========================================
-- 4. Storage: assessment-cache owner-scoped read
-- =========================================

CREATE POLICY "Users can read own assessment cache"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'assessment-cache'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
