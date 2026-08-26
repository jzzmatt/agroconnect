"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CourseCard } from "@/components/ui/CourseCard";
import { useI18n } from "@/i18n/provider";
import { listMyEnrolledCourseIdsAction } from "@/lib/services/course-actions";
import { mapCourseToCardProps } from "@/lib/services/course-service";
import type { CourseListItem } from "@/types/agriacademy";

export function CourseCatalogGrid({ courses }: { courses: CourseListItem[] }) {
  const { dict } = useI18n();
  const { isSignedIn } = useAuth();
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isSignedIn) {
      setEnrolledIds(new Set());
      return;
    }
    void listMyEnrolledCourseIdsAction().then((ids) => setEnrolledIds(new Set(ids)));
  }, [isSignedIn]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {courses.map((course) => {
        const enrolled = enrolledIds.has(course.id);
        return (
          <CourseCard
            key={course.id}
            {...mapCourseToCardProps(course, {
              enrolled,
              ctaLabel: enrolled ? dict.agriacademy.continueCourse : dict.agriacademy.register,
              ctaHref: `/agriacademy/courses/${course.slug}`,
            })}
          />
        );
      })}
    </div>
  );
}
