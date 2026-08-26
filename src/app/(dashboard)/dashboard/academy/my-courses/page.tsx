"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EnrolledCourseCard } from "@/components/academy/EnrolledCourseCard";
import { useI18n } from "@/i18n/provider";
import { listMyEnrolledCoursesAction } from "@/lib/services/course-actions";
import type { EnrolledCourseListItem } from "@/types/agriacademy";

export default function MyEnrolledCoursesPage() {
  const { dict } = useI18n();
  const [courses, setCourses] = useState<EnrolledCourseListItem[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      setCourses(await listMyEnrolledCoursesAction());
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <BookOpenCheck className="w-8 h-8 text-primary mb-2" />
        <h1 className="text-2xl font-black">{dict.agriacademy.myEnrolledCoursesTitle}</h1>
        <p className="text-xs text-muted-foreground mt-1">{dict.agriacademy.myEnrolledCoursesSubtitle}</p>
      </div>

      {isPending && courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
      ) : courses.length === 0 ? (
        <div className="bg-surface-card rounded-3xl border border-border p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">{dict.agriacademy.noEnrolledCourses}</p>
          <Link href="/agriacademy">
            <Button type="button" className="font-bold">
              {dict.agriacademy.exploreCourses}
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map((item) => (
            <EnrolledCourseCard key={item.enrollmentId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
