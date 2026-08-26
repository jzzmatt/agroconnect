-- Phase 7.1 fix: enrolled students may read Bunny video metadata for lessons
-- in courses they are actively enrolled in. Playback URLs are still only
-- issued server-side after enrollment verification.

DROP POLICY IF EXISTS "Enrolled students read enrolled course videos" ON public.academy_videos;
CREATE POLICY "Enrolled students read enrolled course videos" ON public.academy_videos
  FOR SELECT
  USING (
    id IN (
      SELECT cl.academy_video_id
      FROM public.course_lessons cl
      INNER JOIN public.course_enrollments ce ON ce.course_id = cl.course_id
      INNER JOIN public.profiles p ON p.id = ce.student_id
      WHERE cl.academy_video_id IS NOT NULL
        AND ce.status = 'active'
        AND p.clerk_user_id = public.current_clerk_user_id()
    )
  );

COMMENT ON POLICY "Enrolled students read enrolled course videos" ON public.academy_videos IS
  'Allows enrolled learners to read video metadata required for authorized server-side playback. Does not expose Bunny URLs publicly.';
