
ALTER TABLE public.daily_whispers ADD COLUMN mood_emoji text;
ALTER TABLE public.daily_whispers ADD COLUMN mood_word text;
ALTER TABLE public.daily_whispers ADD COLUMN mood_score integer;
