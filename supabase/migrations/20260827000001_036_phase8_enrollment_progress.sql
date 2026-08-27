-- Phase 8: persist last opened lesson independently of YouTube playback.

ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS last_lesson_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'course_enrollments_last_lesson_id_fkey'
  ) THEN
    ALTER TABLE public.course_enrollments
      ADD CONSTRAINT course_enrollments_last_lesson_id_fkey
      FOREIGN KEY (last_lesson_id) REFERENCES public.course_lessons(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_course_enrollments_last_lesson
  ON public.course_enrollments(last_lesson_id);

COMMENT ON COLUMN public.course_enrollments.last_lesson_id IS
  'Last lesson the student opened in AgroConnect. Independent of YouTube hosting.';

COMMENT ON TABLE public.course_enrollments IS
  'Student enrollment and last-lesson resume. Progress is stored here, not on YouTube.';
