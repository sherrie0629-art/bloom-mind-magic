
-- Add deep_report_count to usage_tracking
ALTER TABLE public.usage_tracking ADD COLUMN deep_report_count integer NOT NULL DEFAULT 0;

-- Add billing_period to user_subscriptions
ALTER TABLE public.user_subscriptions ADD COLUMN billing_period text NOT NULL DEFAULT 'monthly';
