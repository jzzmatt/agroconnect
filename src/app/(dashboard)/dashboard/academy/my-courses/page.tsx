"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { GraduationCap, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createCourseAction, listMyCoursesAction } from "@/lib/services/course-actions";
import type { CourseListItem } from "@/types/agriacademy";
import { useRouter } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  paused: "Em pausa",
  archived: "Arquivado",
};

export default function MyCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isPending, startTransition] = useTransition();

  const refresh = () => {
    startTransition(async () => {
      setCourses(await listMyCoursesAction(true));
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = () => {
    startTransition(async () => {
      const created = await createCourseAction({
        title: "Novo curso AgriAcademy",
        description: "Descrição do curso em preparação.",
      });
      router.push(`/dashboard/academy/courses/${created.id}/edit`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <GraduationCap className="w-8 h-8 text-primary mb-2" />
          <h1 className="text-2xl font-black">Meus Cursos</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Criar, editar e publicar formações AgriAcademy.
          </p>
        </div>
        <Button type="button" onClick={handleCreate} disabled={isPending} className="font-bold">
          <Plus className="w-4 h-4 mr-1.5" />
          Novo curso
        </Button>
      </div>

      {courses.length === 0 ? (
        <div className="bg-surface-card rounded-3xl border border-border p-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Ainda não criou nenhum curso.</p>
          <Link href="/dashboard/academy" className="text-xs font-bold text-primary hover:underline">
            Gerir biblioteca de vídeos
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/dashboard/academy/courses/${course.id}/edit`}
              className="bg-surface-card rounded-3xl border border-border p-5 hover:border-primary transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold">{course.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">{course.slug}</p>
                </div>
                <Badge variant="pillarAcademy">{STATUS_LABELS[course.status] || course.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
