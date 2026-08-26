"use client";

import React, { useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { listOwnedCourseStudentsAction } from "@/lib/services/course-actions";
import { useI18n } from "@/i18n/provider";
import type { CourseEnrollmentStudentRow } from "@/types/agriacademy";

function formatEnrollmentDate(value: string, locale: string): string {
  return new Date(value).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function CourseStudentsModal({
  open,
  courseId,
  courseTitle,
  onClose,
}: {
  open: boolean;
  courseId: string | null;
  courseTitle: string;
  onClose: () => void;
}) {
  const { dict, locale } = useI18n();
  const [students, setStudents] = useState<CourseEnrollmentStudentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !courseId) return;
    startTransition(async () => {
      setError(null);
      try {
        const rows = await listOwnedCourseStudentsAction(courseId);
        setStudents(rows);
      } catch {
        setStudents([]);
        setError(dict.agriacademy.studentsLoadError);
      }
    });
  }, [courseId, dict.agriacademy.studentsLoadError, open]);

  if (!open || !courseId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-elevated border border-border rounded-3xl p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-black">{dict.agriacademy.studentsListTitle}</h3>
            <p className="text-xs text-muted-foreground mt-1">{courseTitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={dict.common.close}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {isPending ? (
          <p className="text-xs text-muted-foreground">{dict.agriacademy.loadingStudents}</p>
        ) : error ? (
          <p className="text-xs font-semibold text-destructive">{error}</p>
        ) : students.length === 0 ? (
          <p className="text-xs text-muted-foreground">{dict.agriacademy.noStudentsEnrolled}</p>
        ) : (
          <ul className="space-y-3">
            {students.map((student) => (
              <li key={student.enrollmentId} className="rounded-2xl border border-border p-3">
                <p className="text-sm font-bold text-foreground">
                  {student.studentEmail || student.studentDisplayName || student.studentId}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {dict.agriacademy.enrolledOn}: {formatEnrollmentDate(student.enrolledAt, locale)}
                </p>
              </li>
            ))}
          </ul>
        )}

        <Button type="button" variant="outline" size="sm" onClick={onClose} className="w-full">
          {dict.common.close}
        </Button>
      </div>
    </div>
  );
}
