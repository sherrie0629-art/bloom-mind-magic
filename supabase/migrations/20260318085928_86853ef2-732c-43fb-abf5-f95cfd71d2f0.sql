-- 用户订阅表
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  expires_at timestamptz,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 单次购买记录
CREATE TABLE public.purchase_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_type text NOT NULL,
  product_id text,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases" ON public.purchase_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own purchases" ON public.purchase_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 每日用量追踪
CREATE TABLE public.usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  track_date date NOT NULL DEFAULT CURRENT_DATE,
  chat_count integer NOT NULL DEFAULT 0,
  assessment_count integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, track_date)
);

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON public.usage_tracking FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own usage" ON public.usage_tracking FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own usage" ON public.usage_tracking FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 合盘报告
CREATE TABLE public.compatibility_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_info jsonb NOT NULL DEFAULT '{}',
  result_data jsonb NOT NULL DEFAULT '{}',
  is_paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compatibility_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own compatibility reports" ON public.compatibility_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own compatibility reports" ON public.compatibility_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own compatibility reports" ON public.compatibility_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger for user_subscriptions
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON public.user_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();