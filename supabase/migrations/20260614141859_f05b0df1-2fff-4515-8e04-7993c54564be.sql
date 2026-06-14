ALTER TABLE public.agent_bonds
  ADD COLUMN IF NOT EXISTS turns_today int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_turn_date date;