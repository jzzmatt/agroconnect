-- Reload PostgREST after youtube_video_id was added, and stop CHECK from
-- rejecting valid extracted IDs. Application code remains the validator.

ALTER TABLE public.course_lessons
  DROP CONSTRAINT IF EXISTS course_lessons_youtube_video_id_check;

NOTIFY pgrst, 'reload schema';
