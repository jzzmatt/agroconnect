"use client";

import React from "react";
import { CourseCatalogGrid } from "@/components/academy/CourseCatalogGrid";
import { useI18n } from "@/i18n/provider";
import type { CourseListItem } from "@/types/agriacademy";

export function ProviderAcademyCoursesSection({
  courses,
  providerName,
}: {
  courses: CourseListItem[];
  providerName: string;
}) {
  const { dict } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {dict.agriacademy.providerPublishedCourses} ({courses.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          {dict.agriacademy.providerPublishedCoursesHint.replace("{name}", providerName)}
        </p>
      </div>

      {courses.length > 0 ? (
        <CourseCatalogGrid courses={courses} />
      ) : (
        <div className="bg-surface-card rounded-3xl p-8 text-center border border-border text-muted-foreground text-sm">
          {dict.agriacademy.noProviderPublishedCourses}
        </div>
      )}
    </div>
  );
}
