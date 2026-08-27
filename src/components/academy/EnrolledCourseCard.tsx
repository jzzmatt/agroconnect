"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { buildCourseLearnPath } from "@/lib/academy/course-navigation";
import { useI18n } from "@/i18n/provider";
import type { EnrolledCourseListItem } from "@/types/agriacademy";

function formatEnrollmentDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function EnrolledCourseCard({ item }: { item: EnrolledCourseListItem }) {
  const { dict, locale } = useI18n();
  const { course, enrolledAt } = item;
  const statusLabels: Record<string, string> = {
    published: dict.agriacademy.statusPublished,
    paused: dict.agriacademy.statusPaused,
    draft: dict.agriacademy.statusDraft,
    archived: dict.agriacademy.statusArchived,
  };

  return (
    <div className="bg-surface-card rounded-3xl border border-border overflow-hidden flex flex-col sm:flex-row">
      <div className="sm:w-40 h-32 sm:h-auto bg-linear-to-br from-emerald-800 to-emerald-950 flex items-center justify-center shrink-0">
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <GraduationCap className="w-10 h-10 text-emerald-200" />
        )}
      </div>
      <div className="flex-1 p-5 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="pillarAcademy">AgriAcademy</Badge>
            <Badge variant="outline">{statusLabels[course.status] || course.status}</Badge>
          </div>
          <h2 className="font-bold text-base">{course.title}</h2>
          <p className="text-xs text-muted-foreground">
            {course.instructor_name}
            {course.instructor_role ? ` · ${course.instructor_role}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {dict.agriacademy.enrolledOn}: {formatEnrollmentDate(enrolledAt, locale)}
          </p>
        </div>
        <Link href={buildCourseLearnPath(course.slug)}>
          <Button type="button" size="sm" className="font-bold">
            {dict.agriacademy.continueCourse}
          </Button>
        </Link>
      </div>
    </div>
  );
}
