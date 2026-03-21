
-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
ON public.user_subscriptions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update all subscriptions
CREATE POLICY "Admins can update all subscriptions"
ON public.user_subscriptions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can insert subscriptions
CREATE POLICY "Admins can insert subscriptions"
ON public.user_subscriptions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can view all purchase records
CREATE POLICY "Admins can view all purchases"
ON public.purchase_records FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can update purchase records
CREATE POLICY "Admins can update all purchases"
ON public.purchase_records FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can view all usage tracking
CREATE POLICY "Admins can view all usage"
ON public.usage_tracking FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can view all assessment results
CREATE POLICY "Admins can view all assessments"
ON public.assessment_results FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
