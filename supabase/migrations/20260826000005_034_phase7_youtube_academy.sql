-- ==============================================================================
-- AGROCONNECT — Phase 7: AgriAcademy YouTube Unlisted foundation
-- Lessons store a YouTube Video ID. AgroConnect does not host Academy video.
-- Bunny is no longer an AgriAcademy playback or upload path.
-- Deleting a course/lesson must never delete a YouTube video (none are stored).
-- ==============================================================================

ALTER TABLE public.course_lessons
  ADD COLUMN IF NOT EXISTS youtube_video_id TEXT,
  ADD COLUMN IF NOT EXISTS youtube_source_url TEXT;

CREATE INDEX IF NOT EXISTS idx_course_lessons_youtube
  ON public.course_lessons(youtube_video_id)
  WHERE youtube_video_id IS NOT NULL;

COMMENT ON COLUMN public.course_lessons.youtube_video_id IS
  'YouTube Unlisted video ID extracted from the instructor-pasted URL. AgroConnect does not store video bytes.';

-- Published Bunny-only courses would present a broken learning experience.
-- Pause them until an instructor attaches valid YouTube references.
UPDATE public.courses
SET status = 'paused',
    updated_at = timezone('utc'::text, now())
WHERE status = 'published'
  AND EXISTS (
    SELECT 1
    FROM public.course_lessons l
    WHERE l.course_id = courses.id
      AND (l.youtube_video_id IS NULL OR btrim(l.youtube_video_id) = '')
  );

NOTIFY pgrst, 'reload schema';
