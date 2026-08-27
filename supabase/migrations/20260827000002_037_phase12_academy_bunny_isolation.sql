-- Phase 12: AgriAcademy no longer uses Bunny. Pause published courses that
-- still have Bunny-only lessons, and stop enrolled reads of academy_videos.
-- Product/shopping Bunny tables and webhooks are unchanged.

DROP POLICY IF EXISTS "Enrolled students read enrolled course videos" ON public.academy_videos;

UPDATE public.courses
SET status = 'paused',
    updated_at = now()
WHERE status = 'published'
  AND id IN (
    SELECT cl.course_id
    FROM public.course_lessons cl
    WHERE cl.academy_video_id IS NOT NULL
      AND (cl.youtube_video_id IS NULL OR btrim(cl.youtube_video_id) = '')
  );

COMMENT ON TABLE public.academy_videos IS
  'Legacy AgriAcademy Bunny metadata. New lessons use course_lessons.youtube_video_id. Do not use for playback.';
