"use client";

import React, { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  Eye,
  Pause,
  Play,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MediaLibraryModal } from "@/components/academy/MediaLibraryModal";
import { formatChapterNumber, formatLessonNumber } from "@/lib/academy/lesson-numbering";
import {
  archiveCourseAction,
  assignLessonVideoAction,
  createLessonAction,
  createSectionAction,
  deleteLessonAction,
  deleteSectionAction,
  getCourseEditorAction,
  pauseCourseAction,
  publishCourseAction,
  resumeCourseAction,
  updateCourseAction,
  updateLessonAction,
  updateSectionAction,
} from "@/lib/services/course-actions";
import { getAcademyStorageAction } from "@/lib/services/academy-video-actions";
import type { CourseEditorTree } from "@/lib/academy/authoring-service";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  paused: "Em pausa",
  archived: "Arquivado",
};

export function CourseEditor({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<CourseEditorTree | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingBytes, setRemainingBytes] = useState(0);
  const [videoLessonId, setVideoLessonId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(async () => {
      const [tree, storage] = await Promise.all([
        getCourseEditorAction(courseId),
        getAcademyStorageAction(),
      ]);
      setCourse(tree);
      if (storage) {
        setRemainingBytes(Math.max(0, storage.limitBytes - storage.usedBytes));
      }
    });
  }, [courseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSaveDraft = () => {
    if (!course) return;
    startTransition(async () => {
      setError(null);
      await updateCourseAction({
        id: course.id,
        title: course.title,
        description: course.description ?? undefined,
        shortDescription: course.short_description ?? undefined,
      });
      setMessage("Rascunho guardado.");
      refresh();
    });
  };

  const runAction = (action: () => Promise<unknown>, success: string) => {
    startTransition(async () => {
      try {
        setError(null);
        await action();
        setMessage(success);
        refresh();
      } catch (err: any) {
        setError(err?.message || "Não foi possível concluir a operação.");
      }
    });
  };

  if (!course) {
    return <p className="text-sm text-muted-foreground">A carregar editor do curso…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <Badge variant="pillarAcademy">{STATUS_LABELS[course.status] || course.status}</Badge>
          <input
            value={course.title}
            onChange={(event) => setCourse({ ...course, title: event.target.value })}
            className="w-full text-2xl font-black bg-transparent border-b border-border focus:outline-none"
          />
          <textarea
            value={course.description || course.short_description || ""}
            onChange={(event) => setCourse({ ...course, description: event.target.value })}
            placeholder="Descrição do curso"
            className="w-full min-h-20 text-sm bg-surface rounded-2xl border border-border p-3"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={handleSaveDraft} disabled={isPending}>
            <Save className="w-3.5 h-3.5 mr-1" />
            Guardar rascunho
          </Button>
          {course.status === "draft" || course.status === "paused" ? (
            <Button
              type="button"
              size="sm"
              onClick={() => runAction(() => publishCourseAction(course.id), "Curso publicado.")}
              disabled={isPending}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              Publicar
            </Button>
          ) : null}
          {course.status === "published" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => runAction(() => pauseCourseAction(course.id), "Curso em pausa.")}
              disabled={isPending}
            >
              <Pause className="w-3.5 h-3.5 mr-1" />
              Pausar
            </Button>
          ) : null}
          {course.status === "paused" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => runAction(() => resumeCourseAction(course.id), "Curso retomado.")}
              disabled={isPending}
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              Retomar
            </Button>
          ) : null}
          {course.status !== "archived" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => runAction(() => archiveCourseAction(course.id), "Curso arquivado.")}
              disabled={isPending}
            >
              <Archive className="w-3.5 h-3.5 mr-1" />
              Arquivar
            </Button>
          ) : null}
        </div>
      </div>

      {message && <p className="text-xs font-semibold text-emerald-600">{message}</p>}
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

      <div className="space-y-4">
        {course.sections.map((section) => (
          <div key={section.id} className="rounded-3xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                {formatChapterNumber(section.sort_order)}
              </span>
              <input
                value={section.title}
                onChange={(event) =>
                  setCourse({
                    ...course,
                    sections: course.sections.map((item) =>
                      item.id === section.id ? { ...item, title: event.target.value } : item
                    ),
                  })
                }
                onBlur={() =>
                  runAction(
                    () => updateSectionAction(section.id, section.title),
                    "Capítulo atualizado."
                  )
                }
                className="flex-1 font-bold bg-transparent border-b border-border focus:outline-none"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  runAction(() => deleteSectionAction(section.id), "Capítulo removido.")
                }
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="space-y-2 pl-4 border-l border-border">
              {section.lessons.map((lesson) => (
                <div key={lesson.id} className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground w-12">
                    {formatLessonNumber(section.sort_order, lesson.sort_order)}
                  </span>
                  <input
                    value={lesson.title}
                    onChange={(event) =>
                      setCourse({
                        ...course,
                        sections: course.sections.map((sec) =>
                          sec.id === section.id
                            ? {
                                ...sec,
                                lessons: sec.lessons.map((item) =>
                                  item.id === lesson.id ? { ...item, title: event.target.value } : item
                                ),
                              }
                            : sec
                        ),
                      })
                    }
                    onBlur={() =>
                      runAction(
                        () => updateLessonAction(lesson.id, { title: lesson.title }),
                        "Aula atualizada."
                      )
                    }
                    className="flex-1 min-w-[160px] text-sm bg-transparent border-b border-border focus:outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setVideoLessonId(lesson.id)}
                  >
                    {lesson.academy_video_id ? "Trocar vídeo" : "Selecionar vídeo"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => runAction(() => deleteLessonAction(lesson.id), "Aula removida.")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  {(lesson as { video?: { title?: string } }).video?.title && (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                      {(lesson as { video?: { title?: string } }).video?.title}
                    </span>
                  )}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  runAction(
                    () => createLessonAction(section.id, "Nova aula"),
                    "Aula adicionada."
                  )
                }
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar aula
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            runAction(() => createSectionAction(course.id, "Novo capítulo"), "Capítulo adicionado.")
          }
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Adicionar capítulo
        </Button>
      </div>

      <Link href="/dashboard/academy/my-courses" className="text-xs font-bold text-primary hover:underline">
        ← Voltar aos meus cursos
      </Link>

      <MediaLibraryModal
        open={Boolean(videoLessonId)}
        remainingBytes={remainingBytes}
        onClose={() => setVideoLessonId(null)}
        onSelect={(videoId) => {
          if (!videoLessonId) return;
          runAction(
            () => assignLessonVideoAction(videoLessonId, videoId),
            "Vídeo associado à aula."
          );
          setVideoLessonId(null);
        }}
      />
    </div>
  );
}
