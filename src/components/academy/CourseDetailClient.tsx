"use client";

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatChapterNumber, formatLessonNumber } from "@/lib/academy/lesson-numbering";
import { buildCourseLearnPath } from "@/lib/academy/course-navigation";
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
  const [isEnrolling, setIsEnrolling] = useState(false);
  const autoEnrollStarted = useRef(false);

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

  const redirectToLearning = useCallback(
    (showEnrollmentSuccess = false) => {
      const learnPath = showEnrollmentSuccess
        ? `${buildCourseLearnPath(slug)}?enrolled=1`
        : buildCourseLearnPath(slug);
      router.push(learnPath);
    },
    [router, slug]
  );

  const completeEnrollment = useCallback(async () => {
    if (!course) return;

    setIsEnrolling(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/academy/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ courseId: course.id }),
      });
      const payload = await res.json().catch(() => null);

      if (!res.ok || !payload?.success) {
        if (payload?.code === "COURSE_NOT_AVAILABLE") {
          setError(dict.agriacademy.courseNotAvailable);
        } else if (payload?.code === "AUTH_REQUIRED") {
          setError(dict.agriacademy.authRequiredToEnroll);
        } else {
          setError(dict.agriacademy.enrollmentFailed);
        }
        return;
      }

      if (!payload.enrollment) {
        setError(dict.agriacademy.enrollmentFailed);
        return;
      }

      setEnrolled(true);
      setMessage(
        payload.alreadyEnrolled
          ? dict.agriacademy.alreadyEnrolled
          : dict.agriacademy.enrollmentSuccess
      );

      setTimeout(() => {
        redirectToLearning(!payload.alreadyEnrolled);
      }, payload.alreadyEnrolled ? 300 : 900);
    } finally {
      setIsEnrolling(false);
    }
  }, [course, dict.agriacademy, redirectToLearning]);

  useEffect(() => {
    if (
      !isSignedIn ||
      searchParams.get("enroll") !== "1" ||
      !course ||
      isEnrolling ||
      autoEnrollStarted.current
    ) {
      return;
    }
    autoEnrollStarted.current = true;
    void completeEnrollment();
  }, [completeEnrollment, course, isEnrolling, isSignedIn, searchParams]);

  const handleEnroll = async () => {
    if (!course || enrolled) return;
    setError(null);
    setMessage(null);

    if (!isSignedIn) {
      const returnUrl = `/agriacademy/courses/${slug}?enroll=1`;
      router.push(`/sign-up?redirect_url=${encodeURIComponent(returnUrl)}`);
      return;
    }

    await completeEnrollment();
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="pillarAcademy">AgriAcademy</Badge>
          {enrolled && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
              <Check className="w-3.5 h-3.5" />
              {dict.agriacademy.enrolledBadge}
            </span>
          )}
        </div>
        <h1 className="text-3xl font-black">{course.title}</h1>
        {course.description && (
          <p className="text-sm text-muted-foreground max-w-3xl">{course.description}</p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {enrolled ? (
            <Link href={buildCourseLearnPath(slug)}>
              <Button type="button" className="font-bold">
                {dict.agriacademy.continueCourse}
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              onClick={handleEnroll}
              disabled={isPending || isEnrolling}
              className="font-bold"
            >
              {dict.agriacademy.register}
            </Button>
          )}
          <Link href="/agriacademy">
            <Button type="button" variant="outline" className="font-bold">
              {dict.common.back}
            </Button>
          </Link>
        </div>
        {message && <p className="text-xs font-semibold text-emerald-600">{message}</p>}
        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
      </div>

      <div className="rounded-3xl border border-border p-5 space-y-3">
        <h2 className="font-bold">{dict.agriacademy.courseContent}</h2>
        <div className="space-y-4">
          {course.sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <h3 className="text-sm font-bold">
                {formatChapterNumber(section.sort_order)} — {section.title}
              </h3>
              <ul className="space-y-1 pl-4">
                {section.lessons.map((lesson) => (
                  <li key={lesson.id} className="text-sm text-muted-foreground">
                    {formatLessonNumber(section.sort_order, lesson.sort_order)} — {lesson.title}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
