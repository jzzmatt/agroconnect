"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Navbar, MobileBottomNav } from "@/components/navigation";
import { Footer } from "@/components/layout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProtectedLessonPlayer } from "@/components/academy/ProtectedLessonPlayer";
import { formatChapterNumber, formatLessonNumber } from "@/lib/academy/lesson-numbering";
import { useI18n } from "@/i18n/provider";
import {
  getCourseEnrollmentStatusAction,
  getPublishedCourseDetailAction,
} from "@/lib/services/course-actions";
import type { CourseWithSections } from "@/types/agriacademy";

export function CourseDetailClient({ slug }: { slug: string }) {
  const { dict } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const [course, setCourse] = useState<CourseWithSections | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const detail = await getPublishedCourseDetailAction(slug);
      setCourse(detail);
      if (detail) {
        const status = await getCourseEnrollmentStatusAction(detail.id);
        setEnrolled(status.enrolled);
      }
    });
  }, [slug]);

  useEffect(() => {
    refresh();
  }, [refresh, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || searchParams.get("enroll") !== "1" || !course) return;
    void handleEnroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, searchParams, course?.id]);

  const handleEnroll = async () => {
    if (!course) return;
    setError(null);
    setMessage(null);

    if (!isSignedIn) {
      const returnUrl = `/agriacademy/courses/${slug}?enroll=1`;
      router.push(`/sign-up?redirect_url=${encodeURIComponent(returnUrl)}`);
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/academy/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ courseId: course.id }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        setError(dict.agriacademy.enrollmentFailed);
        return;
      }
      setEnrolled(true);
      setMessage(
        payload.alreadyEnrolled
          ? dict.agriacademy.alreadyEnrolled
          : dict.agriacademy.enrollmentSuccess
      );
      router.replace(`/agriacademy/courses/${slug}`);
    });
  };

  if (!course) {
    return (
      <p className="text-sm text-muted-foreground text-center py-16">
        {isPending ? dict.common.loading : dict.agriacademy.courseNotFound}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Badge variant="pillarAcademy">AgriAcademy</Badge>
        <h1 className="text-3xl font-black">{course.title}</h1>
        {course.description && (
          <p className="text-sm text-muted-foreground max-w-3xl">{course.description}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            type="button"
            onClick={handleEnroll}
            disabled={isPending || enrolled}
            className="font-bold"
          >
            {enrolled ? dict.agriacademy.continueCourse : dict.agriacademy.register}
          </Button>
          <Link href="/agriacademy">
            <Button type="button" variant="outline" className="font-bold">
              {dict.common.back}
            </Button>
          </Link>
        </div>
        {message && <p className="text-xs font-semibold text-emerald-600">{message}</p>}
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
      </div>

      <div className="space-y-6">
        {course.sections.map((section) => (
          <div key={section.id} className="rounded-3xl border border-border p-5 space-y-4">
            <h2 className="font-bold">
              {formatChapterNumber(section.sort_order)} — {section.title}
            </h2>
            <div className="space-y-4">
              {section.lessons.map((lesson) => (
                <div key={lesson.id} className="space-y-2">
                  <h3 className="text-sm font-bold">
                    {formatLessonNumber(section.sort_order, lesson.sort_order)} — {lesson.title}
                  </h3>
                  <ProtectedLessonPlayer
                    lessonId={lesson.id}
                    title={lesson.title}
                    enabled={enrolled}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
