-- Additive migration: existing lesson completion and course content are untouched.
CREATE TABLE public.exercise_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  exercise_id text NOT NULL CHECK (length(exercise_id) BETWEEN 1 AND 80),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id, exercise_id)
);

ALTER TABLE public.exercise_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_progress TO authenticated;

CREATE POLICY "Read own exercise progress" ON public.exercise_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Remove own exercise progress" ON public.exercise_progress
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Complete accessible exercise" ON public.exercise_progress
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.lessons l,
        LATERAL jsonb_array_elements(l.steps) WITH ORDINALITY AS s(step, position)
      WHERE l.id = lesson_id
        AND COALESCE(NULLIF(s.step->>'id', ''), 'step-' || s.position) = exercise_id
    )
  );
CREATE POLICY "Update own accessible exercise" ON public.exercise_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (
    auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.lessons l,
        LATERAL jsonb_array_elements(l.steps) WITH ORDINALITY AS s(step, position)
      WHERE l.id = lesson_id
        AND COALESCE(NULLIF(s.step->>'id', ''), 'step-' || s.position) = exercise_id
    )
  );
