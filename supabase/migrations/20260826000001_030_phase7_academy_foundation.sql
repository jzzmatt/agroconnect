-- ==============================================================================
-- AGROCONNECT — Phase 7: Migration 029 - AgriAcademy LMS Foundation
-- Courses, sections, lessons, enrollments, publication lifecycle, and RLS.
-- Bunny Stream video metadata remains on academy_videos (Phase 4/9.5).
-- ==============================================================================

-- 1. Courses
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  short_description TEXT,
  description TEXT,
  level TEXT NOT NULL DEFAULT 'all_levels' CHECK (
    level IN ('beginner', 'intermediate', 'advanced', 'all_levels')
  ),
  price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'AOA',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'paused', 'archived')
  ),
  thumbnail_url TEXT,
  duration_hours INTEGER,
  lessons_count INTEGER NOT NULL DEFAULT 0,
  students_count INTEGER NOT NULL DEFAULT 0,
  rating NUMERIC(3, 2),
  province_id UUID REFERENCES public.provinces(id) ON DELETE SET NULL,
  municipality_id UUID REFERENCES public.municipalities(id) ON DELETE SET NULL,
  province_name TEXT,
  municipality_name TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_courses_owner_id ON public.courses(owner_id);
CREATE INDEX IF NOT EXISTS idx_courses_provider_id ON public.courses(provider_id);
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON public.courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON public.courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(status, published_at DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_courses_province ON public.courses(province_name);
CREATE INDEX IF NOT EXISTS idx_courses_title_desc_gin ON public.courses
  USING gin (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(short_description, '')));

DROP TRIGGER IF EXISTS tr_courses_updated_at ON public.courses;
CREATE TRIGGER tr_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Course sections (modules)
CREATE TABLE IF NOT EXISTS public.course_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_course_sections_course ON public.course_sections(course_id, sort_order);

DROP TRIGGER IF EXISTS tr_course_sections_updated_at ON public.course_sections;
CREATE TRIGGER tr_course_sections_updated_at BEFORE UPDATE ON public.course_sections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Course lessons
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.course_sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  academy_video_id UUID REFERENCES public.academy_videos(id) ON DELETE SET NULL,
  duration_seconds INTEGER,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON public.course_lessons(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_course_lessons_section ON public.course_lessons(section_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_course_lessons_video ON public.course_lessons(academy_video_id);

DROP TRIGGER IF EXISTS tr_course_lessons_updated_at ON public.course_lessons;
CREATE TRIGGER tr_course_lessons_updated_at BEFORE UPDATE ON public.course_lessons FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Course enrollments (foundation — no progress tracking yet)
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'completed', 'cancelled', 'suspended')
  ),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_course_enrollment UNIQUE (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_status ON public.course_enrollments(status);

DROP TRIGGER IF EXISTS tr_course_enrollments_updated_at ON public.course_enrollments;
CREATE TRIGGER tr_course_enrollments_updated_at BEFORE UPDATE ON public.course_enrollments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Link academy_videos to courses and lessons
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'academy_videos_course_id_fkey'
  ) THEN
    ALTER TABLE public.academy_videos
      ADD CONSTRAINT academy_videos_course_id_fkey
      FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'academy_videos_chapter_id_fkey'
  ) THEN
    ALTER TABLE public.academy_videos
      ADD CONSTRAINT academy_videos_chapter_id_fkey
      FOREIGN KEY (chapter_id) REFERENCES public.course_lessons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 6. Row Level Security
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Courses: public read published; owners manage own
DROP POLICY IF EXISTS "Public read published courses" ON public.courses;
CREATE POLICY "Public read published courses" ON public.courses FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Instructors manage own courses" ON public.courses;
CREATE POLICY "Instructors manage own courses" ON public.courses FOR ALL
  USING (owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

-- Sections: owner of parent course
DROP POLICY IF EXISTS "Public read sections of published courses" ON public.course_sections;
CREATE POLICY "Public read sections of published courses" ON public.course_sections FOR SELECT
  USING (course_id IN (SELECT id FROM public.courses WHERE status = 'published'));

DROP POLICY IF EXISTS "Instructors manage own course sections" ON public.course_sections;
CREATE POLICY "Instructors manage own course sections" ON public.course_sections FOR ALL
  USING (course_id IN (
    SELECT id FROM public.courses
    WHERE owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())
  ))
  WITH CHECK (course_id IN (
    SELECT id FROM public.courses
    WHERE owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())
  ));

-- Lessons: owner of parent course; enrolled students read (foundation)
DROP POLICY IF EXISTS "Public read preview lessons of published courses" ON public.course_lessons;
CREATE POLICY "Public read preview lessons of published courses" ON public.course_lessons FOR SELECT
  USING (
    is_free_preview = true
    AND course_id IN (SELECT id FROM public.courses WHERE status = 'published')
  );

DROP POLICY IF EXISTS "Enrolled students read course lessons" ON public.course_lessons;
CREATE POLICY "Enrolled students read course lessons" ON public.course_lessons FOR SELECT
  USING (
    course_id IN (
      SELECT ce.course_id FROM public.course_enrollments ce
      JOIN public.profiles p ON p.id = ce.student_id
      WHERE p.clerk_user_id = public.current_clerk_user_id()
        AND ce.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Instructors manage own course lessons" ON public.course_lessons;
CREATE POLICY "Instructors manage own course lessons" ON public.course_lessons FOR ALL
  USING (course_id IN (
    SELECT id FROM public.courses
    WHERE owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())
  ))
  WITH CHECK (course_id IN (
    SELECT id FROM public.courses
    WHERE owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())
  ));

-- Enrollments: students manage own; instructors read for their courses
DROP POLICY IF EXISTS "Students manage own enrollments" ON public.course_enrollments;
CREATE POLICY "Students manage own enrollments" ON public.course_enrollments FOR ALL
  USING (student_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()))
  WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id()));

DROP POLICY IF EXISTS "Instructors read course enrollments" ON public.course_enrollments;
CREATE POLICY "Instructors read course enrollments" ON public.course_enrollments FOR SELECT
  USING (course_id IN (
    SELECT id FROM public.courses
    WHERE owner_id IN (SELECT id FROM public.profiles WHERE clerk_user_id = public.current_clerk_user_id())
  ));

COMMENT ON TABLE public.courses IS 'AgriAcademy courses. Instructor identity references profiles; provider_id links to provider_profiles for /providers/[slug].';
COMMENT ON TABLE public.course_sections IS 'Ordered sections (modules) within a course.';
COMMENT ON TABLE public.course_lessons IS 'Ordered lessons within a section. Training video metadata lives on academy_videos (Bunny Stream).';
COMMENT ON TABLE public.course_enrollments IS 'Student enrollment foundation. Progress tracking belongs to Phase 8.';
