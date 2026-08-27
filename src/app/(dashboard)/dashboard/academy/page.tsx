"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, Lock, Plus, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CourseAuthoringGuide } from "@/components/academy/CourseAuthoringGuide";
import { CourseStudentsModal } from "@/components/academy/CourseStudentsModal";
import { useI18n } from "@/i18n/provider";
import { useAuthoritativePlan } from "@/lib/subscription/use-authoritative-plan";
import { can, subjectFromProfile } from "@/lib/authorization";
import {
  dashboardAuthoringStepLabels,
  formatAuthoringNextAction,
} from "@/lib/academy/authoring-copy";
import type { AuthoringProgress } from "@/lib/academy/authoring-progress";
import {
  createCourseAction,
  getCourseCreatorDashboardAction,
} from "@/lib/services/course-actions";
import type { CourseListItem } from "@/types/agriacademy";

type PublishedCourse = CourseListItem & { studentCount: number };
type DraftCourse = CourseListItem & { progress: AuthoringProgress };

export default function CourseCreatorPage() {
  const { dict } = useI18n();
  const router = useRouter();
  const { plan } = useAuthoritativePlan();
  const [draftCourses, setDraftCourses] = useState<DraftCourse[]>([]);
  const [publishedCourses, setPublishedCourses] = useState<PublishedCourse[]>([]);
  const [studentsCourse, setStudentsCourse] = useState<PublishedCourse | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletedNotice, setDeletedNotice] = useState(false);

  const statusLabels: Record<string, string> = {
    draft: dict.agriacademy.statusDraft,
    published: dict.agriacademy.statusPublished,
    paused: dict.agriacademy.statusPaused,
    archived: dict.agriacademy.statusArchived,
  };

  const subject = subjectFromProfile({
    id: "",
    clerk_user_id: "",
    roles: [],
    account_type: "customer",
    subscription_plan: plan,
  });
  const canManage = can(subject, "academy.course.create");

  const refresh = useCallback(async () => {
    const dashboard = canManage
      ? await getCourseCreatorDashboardAction().catch(() => ({
          draftCourses: [] as DraftCourse[],
          publishedCourses: [] as PublishedCourse[],
        }))
      : { draftCourses: [] as DraftCourse[], publishedCourses: [] as PublishedCourse[] };
    setDraftCourses(dashboard.draftCourses);
    setPublishedCourses(dashboard.publishedCourses);
  }, [canManage]);

  useEffect(() => {
    void refresh();
  }, [refresh, plan]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("courseDeleted") === "1") {
      setDeletedNotice(true);
      router.replace("/dashboard/academy");
    }
  }, [router]);

  const handleCreate = async () => {
    if (isCreating) return;
    setCreateError(null);
    setIsCreating(true);
    try {
      const created = await createCourseAction({
        title: dict.agriacademy.newCourseDefaultTitle,
        description: dict.agriacademy.newCourseDefaultDescription,
      });
      router.push(`/dashboard/academy/courses/${created.id}/edit`);
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : dict.agriacademy.unableToCreateCourse
      );
    } finally {
      setIsCreating(false);
    }
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

  const hasNoCourses = draftCourses.length === 0 && publishedCourses.length === 0;

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

      {createError && <p className="text-xs font-semibold text-destructive">{createError}</p>}
      {deletedNotice && (
        <p className="text-xs font-semibold text-emerald-600">{dict.agriacademy.courseDeleted}</p>
      )}

      {hasNoCourses ? (
        <div className="rounded-3xl border border-border bg-surface-card p-5 space-y-3">
          <p className="text-xs font-semibold text-primary">
            {dict.agriacademy.authoringNextStep}: {dict.agriacademy.authoringNextCreateFirstCourse}
          </p>
          <Button type="button" size="sm" onClick={() => void handleCreate()} disabled={isCreating}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            {dict.agriacademy.createNewCourse}
          </Button>
        </div>
      ) : null}

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
                className="bg-surface-card rounded-3xl border border-border p-5 hover:border-primary transition-colors space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{course.slug}</p>
                  </div>
                  <Badge variant="pillarAcademy">{statusLabels[course.status] || course.status}</Badge>
                </div>
                <CourseAuthoringGuide
                  compact
                  progress={course.progress}
                  title={dict.agriacademy.authoringGuideTitle}
                  nextStepLabel={dict.agriacademy.authoringNextStep}
                  stepLabels={dashboardAuthoringStepLabels(dict.agriacademy)}
                  nextActionMessage={formatAuthoringNextAction(course.progress.nextAction, dict.agriacademy)}
                />
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
