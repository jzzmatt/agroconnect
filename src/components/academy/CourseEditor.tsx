"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  Archive,
  Check,
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
import { useI18n } from "@/i18n/provider";
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

type SaveState = "idle" | "saving" | "success" | "error";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicado",
  paused: "Em pausa",
  archived: "Arquivado",
};

function formatSavedTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function CourseEditor({ courseId }: { courseId: string }) {
  const { dict, locale } = useI18n();
  const [course, setCourse] = useState<CourseEditorTree | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remainingBytes, setRemainingBytes] = useState(0);
  const [videoLessonId, setVideoLessonId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const courseFingerprint = useMemo(() => {
    if (!course) return "";
    return JSON.stringify({
      title: course.title,
      description: course.description ?? "",
      short_description: course.short_description ?? "",
    });
  }, [course]);

  const isDirty = Boolean(course && courseFingerprint !== savedSnapshot);
  const isSaving = saveState === "saving" || isPending;

  const refresh = useCallback(() => {
    startTransition(async () => {
      const [tree, storage] = await Promise.all([
        getCourseEditorAction(courseId),
        getAcademyStorageAction(),
      ]);
      setCourse(tree);
      if (tree) {
        setSavedSnapshot(
          JSON.stringify({
            title: tree.title,
            description: tree.description ?? "",
            short_description: tree.short_description ?? "",
          })
        );
      }
      if (storage) {
        setRemainingBytes(Math.max(0, storage.limitBytes - storage.usedBytes));
      }
    });
  }, [courseId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const handleSaveDraft = async () => {
    if (!course || isSaving) return;

    setSaveState("saving");
    setSaveError(null);
    setMessage(null);

    const result = await updateCourseAction({
      id: course.id,
      title: course.title,
      description: course.description ?? undefined,
      shortDescription: course.short_description ?? undefined,
    });

    if (!result.success || !result.course) {
      setSaveState("error");
      setSaveError(result.error || dict.agriacademy.unableToSave);
      return;
    }

    const now = new Date();
    setSavedSnapshot(courseFingerprint);
    setLastSavedAt(now);
    setSaveState("success");
    setMessage(dict.agriacademy.draftSaved);

    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setSaveState("idle");
      setMessage(null);
    }, 3000);
  };

  const runAction = (action: () => Promise<unknown>, success: string) => {
    startTransition(async () => {
      try {
        setError(null);
        await action();
        setMessage(success);
        refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : dict.agriacademy.unableToSave;
        setError(msg);
      }
    });
  };

  if (!course) {
    return <p className="text-sm text-muted-foreground">{dict.common.loading}</p>;
  }

  const saveButtonLabel =
    saveState === "saving"
      ? dict.agriacademy.saving
      : saveState === "success"
        ? dict.agriacademy.draftSaved
        : dict.agriacademy.saveDraft;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="pillarAcademy">{STATUS_LABELS[course.status] || course.status}</Badge>
            {isDirty && (
              <span className="text-[11px] font-semibold text-amber-600">• Alterações por guardar</span>
            )}
            {lastSavedAt && saveState !== "success" && (
              <span className="text-[11px] text-muted-foreground">
                {dict.agriacademy.savedAt.replace("{time}", formatSavedTime(lastSavedAt, locale))}
              </span>
            )}
          </div>
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
          <Button
            type="button"
            size="sm"
            variant={saveState === "success" ? "primary" : "outline"}
            onClick={handleSaveDraft}
            disabled={isSaving || !isDirty}
            className={
              saveState === "success"
                ? "bg-emerald-600 hover:bg-emerald-600 text-white border-emerald-600"
                : saveState === "error"
                  ? "border-destructive text-destructive"
                  : undefined
            }
          >
            {saveState === "success" ? (
              <Check className="w-3.5 h-3.5 mr-1" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1" />
            )}
            {saveButtonLabel}
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

      {message && saveState === "success" && (
        <p className="text-xs font-semibold text-emerald-600 animate-in fade-in">{message}</p>
      )}
      {(saveError || error) && (
        <p className="text-xs font-semibold text-destructive">
          {saveError ? `❌ ${saveError}` : error}
        </p>
      )}

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
                    {lesson.academy_video_id
                      ? dict.agriacademy.replaceVideo
                      : dict.agriacademy.selectVideo}
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

      <Link href="/dashboard/academy" className="text-xs font-bold text-primary hover:underline">
        ← Voltar à criação de cursos
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
