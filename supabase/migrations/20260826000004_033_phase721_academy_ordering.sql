-- ==============================================================================
-- AGROCONNECT — Phase 7.2.1: Repair Academy chapter/lesson ordering
-- Normalize duplicate sort_order values, then enforce parent-scoped uniqueness.
-- Does not delete chapters, lessons, or reusable academy_videos / Bunny assets.
-- ==============================================================================

-- 1. Shift existing section positions so sequential rewrite cannot collide.
UPDATE public.course_sections
   SET sort_order = sort_order + 1000000;

WITH ordered_sections AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY course_id
      ORDER BY sort_order ASC, created_at ASC, id ASC
    ) AS new_order
  FROM public.course_sections
)
UPDATE public.course_sections cs
   SET sort_order = ordered_sections.new_order
  FROM ordered_sections
 WHERE cs.id = ordered_sections.id;

-- 2. Repair course_lessons.sort_order per chapter (not a global lesson counter).
UPDATE public.course_lessons
   SET sort_order = sort_order + 1000000;

WITH ordered_lessons AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY section_id
      ORDER BY sort_order ASC, created_at ASC, id ASC
    ) AS new_order
  FROM public.course_lessons
)
UPDATE public.course_lessons cl
   SET sort_order = ordered_lessons.new_order
  FROM ordered_lessons
 WHERE cl.id = ordered_lessons.id;

-- 3. Parent-scoped uniqueness (not a global unique constraint on sort_order).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_course_sections_course_id_sort_order'
  ) THEN
    ALTER TABLE public.course_sections
      ADD CONSTRAINT uq_course_sections_course_id_sort_order
      UNIQUE (course_id, sort_order);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_course_lessons_section_id_sort_order'
  ) THEN
    ALTER TABLE public.course_lessons
      ADD CONSTRAINT uq_course_lessons_section_id_sort_order
      UNIQUE (section_id, sort_order);
  END IF;
END $$;

COMMENT ON CONSTRAINT uq_course_sections_course_id_sort_order ON public.course_sections IS
  'Chapter positions are unique within a course.';
COMMENT ON CONSTRAINT uq_course_lessons_section_id_sort_order ON public.course_lessons IS
  'Lesson positions are unique within a chapter.';
