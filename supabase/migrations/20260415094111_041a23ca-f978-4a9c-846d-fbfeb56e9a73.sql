
-- Fix 1: Block all writes to user_roles for non-admin users
-- Currently there's no INSERT policy, but RLS without explicit deny can still allow inserts
-- Add explicit deny-all INSERT/UPDATE/DELETE policies

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Drop permissive INSERT policy on user_subscriptions that allows any plan value
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.user_subscriptions;

-- Add restrictive INSERT policy: users can only create free subscriptions
CREATE POLICY "Users can insert own free subscription"
ON public.user_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND plan = 'free');
