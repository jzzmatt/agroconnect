"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, Plus, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AcademyStorageCard } from "@/components/academy/AcademyStorageCard";
import { CourseStudentsModal } from "@/components/academy/CourseStudentsModal";
import { useI18n } from "@/i18n/provider";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { can, subjectFromProfile } from "@/lib/authorization";
import {
  createCourseAction,
  getCourseCreatorDashboardAction,
} from "@/lib/services/course-actions";
import { getAcademyStorageAction } from "@/lib/services/academy-video-actions";
import type { CourseListItem } from "@/types/agriacademy";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  paused: "Em pausa",
  archived: "Arquivado",
};

type PublishedCourse = CourseListItem & { studentCount: number };

export default function CourseCreatorPage() {
  const { dict } = useI18n();
  const router = useRouter();
  const { plan } = useAuthoritativePlan();
  const [draftCourses, setDraftCourses] = useState<CourseListItem[]>([]);
  const [publishedCourses, setPublishedCourses] = useState<PublishedCourse[]>([]);
  const [storage, setStorage] = useState<Awaited<ReturnType<typeof getAcademyStorageAction>> | null>(null);
  const [studentsCourse, setStudentsCourse] = useState<PublishedCourse | null>(null);
  const [, startRefresh] = useTransition();
  const [isCreating, startCreate] = useTransition();

  const subject = subjectFromProfile({
    id: "",
    clerk_user_id: "",
    roles: [],
    account_type: "customer",
    subscription_plan: plan,
  });
  const canManage = can(subject, "academy.course.create");

  const refresh = useCallback(() => {
    startRefresh(async () => {
      const [dashboard, storageData] = await Promise.all([
        canManage ? getCourseCreatorDashboardAction().catch(() => ({ draftCourses: [], publishedCourses: [] })) : Promise.resolve({ draftCourses: [], publishedCourses: [] }),
        canManage ? getAcademyStorageAction().catch(() => null) : Promise.resolve(null),
      ]);
      setDraftCourses(dashboard.draftCourses);
      setPublishedCourses(dashboard.publishedCourses);
      setStorage(storageData);
    });
  }, [canManage]);

  useEffect(() => {
    refresh();
  }, [refresh, plan]);

  const handleCreate = () => {
    startCreate(async () => {
      const created = await createCourseAction({
        title: "Novo curso AgriAcademy",
        description: "Descrição do curso em preparação.",
      });
      router.push(`/dashboard/academy/courses/${created.id}/edit`);
    });
  };

  if (!canManage) {
    return (
      <div className="space-y-6">
        <div className="bg-surface-card rounded-3xl border border-border p-6 sm:p-8 text-center space-y-4">
          <Lock className="w-10 h-10 text-amber-600 mx-auto" />
          <h1 className="text-2xl font-black">{dict.agriacademy.courseCreatorLocked}</h1>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {dict.agriacademy.courseCreatorLockedHint}
          </p>
          <Link href="/planos">
            <Button variant="primary" className="font-bold">
              <Sparkles className="w-4 h-4 mr-1.5" />
              {dict.agriacademy.upgradePlan}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <GraduationCap className="w-8 h-8 text-primary mb-2" />
          <h1 className="text-2xl font-black">{dict.agriacademy.courseCreatorTitle}</h1>
          <p className="text-xs text-muted-foreground mt-1">{dict.agriacademy.courseCreatorSubtitle}</p>
        </div>
        <Button type="button" onClick={handleCreate} disabled={isCreating} className="font-bold">
          <Plus className="w-4 h-4 mr-1.5" />
          {dict.agriacademy.createNewCourse}
        </Button>
      </div>

      {storage && (
        <AcademyStorageCard
          usedBytes={storage.usedBytes}
          limitBytes={storage.limitBytes}
          usedLabel={storage.usedLabel}
          limitLabel={storage.limitLabel}
          percent={storage.percent}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-black">{dict.agriacademy.draftCourses}</h2>
        {draftCourses.length === 0 ? (
          <p className="text-xs text-muted-foreground">{dict.agriacademy.noDraftCourses}</p>
        ) : (
          <div className="grid gap-3">
            {draftCourses.map((course) => (
              <Link
                key={course.id}
                href={`/dashboard/academy/courses/${course.id}/edit`}
                className="bg-surface-card rounded-3xl border border-border p-5 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{course.slug}</p>
                  </div>
                  <Badge variant="pillarAcademy">{STATUS_LABELS[course.status] || course.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-black">{dict.agriacademy.publishedCourses}</h2>
        {publishedCourses.length === 0 ? (
          <p className="text-xs text-muted-foreground">{dict.agriacademy.noPublishedCourses}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {publishedCourses.map((course) => (
              <div
                key={course.id}
                className="bg-surface-card rounded-3xl border border-border p-5 space-y-4"
              >
                <div className="space-y-1">
                  <h3 className="font-bold">{course.title}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {dict.agriacademy.studentsCount.replace("{count}", String(course.studentCount))}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setStudentsCourse(course)}
                  >
                    {dict.agriacademy.viewStudents}
                  </Button>
                  <Link href={`/dashboard/academy/courses/${course.id}/edit`}>
                    <Button type="button" size="sm" variant="outline">
                      {dict.common.edit}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <CourseStudentsModal
        open={Boolean(studentsCourse)}
        courseId={studentsCourse?.id ?? null}
        courseTitle={studentsCourse?.title ?? ""}
        onClose={() => setStudentsCourse(null)}
      />
    </div>
  );
}
