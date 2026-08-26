"use client";

import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProtectedLessonPlayer } from "@/components/academy/ProtectedLessonPlayer";
import { formatChapterNumber, formatLessonNumber } from "@/lib/academy/lesson-numbering";
import { buildCourseLearnPath } from "@/lib/academy/course-navigation";
import { useI18n } from "@/i18n/provider";
import { getCourseLearnContextAction } from "@/lib/services/course-actions";
import type { CourseLessonRecord, CourseWithSections } from "@/types/agriacademy";

export function CourseLearnClient({ slug }: { slug: string }) {
  const { dict } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState<CourseWithSections | null>(null);
  const [activeLesson, setActiveLesson] = useState<CourseLessonRecord | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const lessonIdParam = searchParams.get("lesson");
  const enrolledBanner = searchParams.get("enrolled") === "1";

  const loadContext = useCallback(() => {
    startTransition(async () => {
      const context = await getCourseLearnContextAction(slug, lessonIdParam);
      if (!context.allowed) {
        if (context.reason === "auth_required") {
          router.replace(
            `/sign-up?redirect_url=${encodeURIComponent(buildCourseLearnPath(slug, lessonIdParam))}`
          );
          return;
        }
        if (context.reason === "not_enrolled") {
          router.replace(`/agriacademy/courses/${slug}`);
          return;
        }
        setError(dict.agriacademy.courseNotFound);
        setCourse(null);
        setActiveLesson(null);
        return;
      }

      setCourse(context.course);
      setActiveLesson(context.startLesson);
      setError(null);

      if (context.startLesson && context.startLesson.id !== lessonIdParam) {
        router.replace(buildCourseLearnPath(slug, context.startLesson.id), { scroll: false });
      }
    });
  }, [dict.agriacademy.courseNotFound, lessonIdParam, router, slug]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  useEffect(() => {
    if (!enrolledBanner) return;
    setShowSuccess(true);
    const timer = setTimeout(() => {
      setShowSuccess(false);
      if (activeLesson) {
        router.replace(buildCourseLearnPath(slug, activeLesson.id), { scroll: false });
      }
    }, 3200);
    return () => clearTimeout(timer);
  }, [activeLesson, enrolledBanner, router, slug]);

  const lessons = useMemo(() => {
    if (!course) return [];
    return course.sections
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((section) =>
        (section.lessons || [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((lesson) => ({ section, lesson }))
      );
  }, [course]);

  if (isPending && !course) {
    return (
      <p className="text-sm text-muted-foreground text-center py-16">{dict.common.loading}</p>
    );
  }

  if (!course || !activeLesson) {
    return (
      <p className="text-sm text-muted-foreground text-center py-16">
        {error || dict.agriacademy.courseNotFound}
      </p>
    );
  }

  const activeSection = course.sections.find((section) =>
    section.lessons?.some((lesson) => lesson.id === activeLesson.id)
  );

  const currentLessonIndex = lessons.findIndex(({ lesson }) => lesson.id === activeLesson.id);
  const previousLesson = currentLessonIndex > 0 ? lessons[currentLessonIndex - 1] : null;
  const nextLesson =
    currentLessonIndex >= 0 && currentLessonIndex < lessons.length - 1
      ? lessons[currentLessonIndex + 1]
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="pillarAcademy">AgriAcademy</Badge>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
            <Check className="w-3.5 h-3.5" />
            {dict.agriacademy.enrolledBadge}
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">{course.title}</h1>
        {showSuccess && (
          <p className="text-xs font-semibold text-emerald-600 animate-in fade-in">
            {dict.agriacademy.enrollmentSuccess}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="rounded-3xl border border-border p-4 space-y-4 h-fit">
          <h2 className="text-sm font-black">{dict.agriacademy.courseContent}</h2>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {course.sections
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((section) => (
                <div key={section.id} className="space-y-1.5">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
                    {formatChapterNumber(section.sort_order)} — {section.title}
                  </p>
                  {(section.lessons || [])
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((lesson) => {
                      const isActive = lesson.id === activeLesson.id;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() =>
                            router.push(buildCourseLearnPath(slug, lesson.id), { scroll: false })
                          }
                          className={`w-full text-left rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          {formatLessonNumber(section.sort_order, lesson.sort_order)} — {lesson.title}
                        </button>
                      );
                    })}
                </div>
              ))}
          </div>
        </aside>

        <section className="space-y-4">
          {activeSection && (
            <p className="text-xs font-bold text-muted-foreground">
              {formatChapterNumber(activeSection.sort_order)} — {activeSection.title}
            </p>
          )}
          <h2 className="text-lg font-black">
            {activeSection
              ? formatLessonNumber(activeSection.sort_order, activeLesson.sort_order)
              : ""}{" "}
            — {activeLesson.title}
          </h2>
          <ProtectedLessonPlayer
            lessonId={activeLesson.id}
            title={activeLesson.title}
            enabled
          />

          <div className="flex flex-wrap gap-2 pt-2">
            {previousLesson ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(buildCourseLearnPath(slug, previousLesson.lesson.id), { scroll: false })
                }
              >
                {dict.agriacademy.previousLesson}
              </Button>
            ) : null}
            {nextLesson ? (
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  router.push(buildCourseLearnPath(slug, nextLesson.lesson.id), { scroll: false })
                }
              >
                {dict.agriacademy.nextLesson}
              </Button>
            ) : null}
            <Link href={`/agriacademy/courses/${slug}`}>
              <Button type="button" variant="outline" size="sm">
                {dict.agriacademy.courseOverview}
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
