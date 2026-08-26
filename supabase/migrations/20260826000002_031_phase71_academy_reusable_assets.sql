-- ==============================================================================
-- AGROCONNECT — Phase 7.1: Migration 031 - Reusable Academy Video Assets
-- Decouple Bunny videos from courses; reference counting via course_lessons.
-- ==============================================================================

ALTER TABLE public.academy_videos
  DROP CONSTRAINT IF EXISTS academy_videos_course_id_fkey;

ALTER TABLE public.academy_videos
  DROP CONSTRAINT IF EXISTS academy_videos_chapter_id_fkey;

ALTER TABLE public.academy_videos
  DROP COLUMN IF EXISTS course_id,
  DROP COLUMN IF EXISTS chapter_id;

ALTER TABLE public.academy_videos
  ADD COLUMN IF NOT EXISTS reference_count INTEGER NOT NULL DEFAULT 0 CHECK (reference_count >= 0),
  ADD COLUMN IF NOT EXISTS orphaned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_academy_videos_owner_status
  ON public.academy_videos(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_academy_videos_orphaned
  ON public.academy_videos(orphaned_at)
  WHERE orphaned_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_academy_video_reference_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.academy_video_id IS NOT NULL THEN
    UPDATE public.academy_videos
       SET reference_count = reference_count + 1,
           orphaned_at = NULL,
           updated_at = timezone('utc'::text, now())
     WHERE id = NEW.academy_video_id;
  ELSIF TG_OP = 'DELETE' AND OLD.academy_video_id IS NOT NULL THEN
    UPDATE public.academy_videos
       SET reference_count = GREATEST(0, reference_count - 1),
           orphaned_at = CASE
             WHEN GREATEST(0, reference_count - 1) = 0 THEN timezone('utc'::text, now())
             ELSE NULL
           END,
           updated_at = timezone('utc'::text, now())
     WHERE id = OLD.academy_video_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.academy_video_id IS DISTINCT FROM NEW.academy_video_id THEN
      IF OLD.academy_video_id IS NOT NULL THEN
        UPDATE public.academy_videos
           SET reference_count = GREATEST(0, reference_count - 1),
               orphaned_at = CASE
                 WHEN GREATEST(0, reference_count - 1) = 0 THEN timezone('utc'::text, now())
                 ELSE NULL
               END,
               updated_at = timezone('utc'::text, now())
         WHERE id = OLD.academy_video_id;
      END IF;
      IF NEW.academy_video_id IS NOT NULL THEN
        UPDATE public.academy_videos
           SET reference_count = reference_count + 1,
               orphaned_at = NULL,
               updated_at = timezone('utc'::text, now())
         WHERE id = NEW.academy_video_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_course_lessons_video_refcount ON public.course_lessons;
CREATE TRIGGER tr_course_lessons_video_refcount
  AFTER INSERT OR UPDATE OF academy_video_id OR DELETE
  ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.sync_academy_video_reference_count();

UPDATE public.academy_videos av
   SET reference_count = COALESCE(sub.cnt, 0)
  FROM (
    SELECT academy_video_id, COUNT(*)::INTEGER AS cnt
      FROM public.course_lessons
     WHERE academy_video_id IS NOT NULL
     GROUP BY academy_video_id
  ) sub
 WHERE av.id = sub.academy_video_id;

UPDATE public.academy_videos
   SET orphaned_at = timezone('utc'::text, now())
 WHERE reference_count = 0
   AND status NOT IN ('deleted')
   AND orphaned_at IS NULL;

COMMENT ON COLUMN public.academy_videos.reference_count IS 'Number of course_lessons referencing this reusable Bunny asset.';
COMMENT ON COLUMN public.academy_videos.orphaned_at IS 'Set when reference_count reaches zero; asset becomes eligible for cleanup.';
