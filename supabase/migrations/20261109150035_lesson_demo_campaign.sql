-- One lesson per course can be the WhatsApp demo. The public link is /a/{code}.

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS demo_campaign BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS demo_share_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_lessons_one_demo
  ON public.course_lessons (course_id)
  WHERE demo_campaign;

CREATE UNIQUE INDEX IF NOT EXISTS uq_course_lessons_demo_share_code
  ON public.course_lessons (demo_share_code)
  WHERE demo_share_code IS NOT NULL;

ALTER TABLE public.course_lessons
  DROP CONSTRAINT IF EXISTS ck_course_lessons_demo_share_code;

ALTER TABLE public.course_lessons
  ADD CONSTRAINT ck_course_lessons_demo_share_code
  CHECK (demo_share_code IS NULL OR demo_share_code ~ '^[a-z2-9]{8}$');
