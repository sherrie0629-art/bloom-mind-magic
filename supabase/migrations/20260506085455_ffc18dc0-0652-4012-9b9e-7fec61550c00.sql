CREATE TABLE public.tarot_card_art (
  card_id integer NOT NULL,
  is_reversed boolean NOT NULL,
  image_path text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, is_reversed)
);

ALTER TABLE public.tarot_card_art ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read card art cache"
ON public.tarot_card_art
FOR SELECT
TO authenticated
USING (true);