CREATE POLICY "Users can update their own results"
ON public.assessment_results
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);