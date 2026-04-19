-- Add Paddle identifiers and environment to user_subscriptions
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text,
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS environment text;

CREATE INDEX IF NOT EXISTS user_subscriptions_paddle_sub_id_idx
  ON public.user_subscriptions (paddle_subscription_id);

-- Realtime: capture full row data on changes and add to publication
ALTER TABLE public.user_subscriptions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'user_subscriptions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions';
  END IF;
END $$;