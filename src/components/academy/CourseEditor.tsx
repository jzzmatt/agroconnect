"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { LessonYouTubeModal } from "@/components/academy/LessonYouTubeModal";
import { CourseConfirmDialog } from "@/components/academy/CourseConfirmDialog";
import { formatChapterNumber, formatLessonNumber } from "@/lib/academy/lesson-numbering";
import { courseEditorFingerprint } from "@/lib/academy/editor-snapshot";
import {
  deleteDialogForStatus,
  type CourseDeleteDialogKind,
} from "@/lib/academy/course-delete-flow";
import type { CourseMutationCode, CourseMutationResult } from "@/lib/academy/course-errors";
import { useI18n } from "@/i18n/provider";
import {
  archiveCourseAction,
  assignLessonYouTubeAction,
  createLessonAction,
  createSectionAction,
  deleteCourseAction,
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
import type { CourseEditorTree } from "@/types/agriacademy";

type SaveState = "idle" | "saving" | "success" | "error";
type LoadState = "loading" | "ready" | "not_found" | "error";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("LOAD_TIMEOUT")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function formatSavedTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function isMutationResult(value: unknown): value is CourseMutationResult<unknown> {
  return Boolean(value) && typeof value === "object" && "success" in (value as object);
}

export function CourseEditor({ courseId }: { courseId: string }) {
  const { dict, locale } = useI18n();
  const router = useRouter();
  const [course, setCourse] = useState<CourseEditorTree | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [videoLessonId, setVideoLessonId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<CourseDeleteDialogKind | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const statusLabels: Record<string, string> = {
    draft: dict.agriacademy.statusDraft,
    published: dict.agriacademy.statusPublished,
    paused: dict.agriacademy.statusPaused,
    archived: dict.agriacademy.statusArchived,
  };

  const courseFingerprint = useMemo(
    () => (course ? courseEditorFingerprint(course) : ""),
    [course]
  );

  const isDirty = Boolean(course && courseFingerprint !== savedSnapshot);
  const isSaving = saveState === "saving" || mutating || deleteBusy;

  const mutationMessage = useCallback(
    (code: CourseMutationCode | undefined, fallback: string) => {
      switch (code) {
        case "UNAUTHORIZED":
          return dict.agriacademy.mutationUnauthorized;
        case "COURSE_NOT_FOUND":
          return dict.agriacademy.mutationNotFound;
        case "COURSE_PUBLISHED":
          return dict.agriacademy.deletePublished;
        case "INVALID_STATE_TRANSITION":
          return dict.agriacademy.mutationInvalidState;
        case "DATABASE_ERROR":
          return dict.agriacademy.mutationDatabaseError;
        case "DEPENDENCY_ERROR":
          return dict.agriacademy.deleteDependencyError;
        case "YOUTUBE_URL_INVALID":
          return dict.agriacademy.youtubeUrlInvalid;
        default:
          return fallback || dict.agriacademy.unableToSave;
      }
    },
    [dict.agriacademy]
  );

  const deleteMessage = useCallback(
    (code: CourseMutationCode | undefined, fallback: string) => {
      switch (code) {
        case "UNAUTHORIZED":
          return dict.agriacademy.deleteUnauthorized;
        case "COURSE_NOT_FOUND":
          return dict.agriacademy.deleteNotFound;
        case "COURSE_PUBLISHED":
          return dict.agriacademy.deletePublished;
        case "DATABASE_ERROR":
          return dict.agriacademy.deleteDatabaseError;
        case "DEPENDENCY_ERROR":
          return dict.agriacademy.deleteDependencyError;
        default:
          return fallback || dict.agriacademy.deleteUnknownError;
      }
    },
    [dict.agriacademy]
  );

  const applyCourseTree = useCallback((tree: CourseEditorTree) => {
    setCourse(tree);
    setSavedSnapshot(courseEditorFingerprint(tree));
  }, []);

  const loadCourse = useCallback(
    async (options: { showLoading?: boolean } = {}) => {
      const showLoading = options.showLoading ?? false;
      if (showLoading) {
        setLoadState("loading");
        setLoadError(null);
      }

      try {
        const tree = await withTimeout(getCourseEditorAction(courseId), 15000);
        if (!tree) {
          setLoadState("not_found");
          setCourse(null);
          return null;
        }
        applyCourseTree(tree);
        setLoadState("ready");
        setLoadError(null);
        return tree;
      } catch (err: unknown) {
        if (!showLoading) {
          setError(
            err instanceof Error && err.message === "LOAD_TIMEOUT"
              ? dict.agriacademy.unableToLoadCourse
              : err instanceof Error
                ? err.message
                : dict.agriacademy.unableToLoadCourse
          );
          return null;
        }
        setLoadState("error");
        setLoadError(
          err instanceof Error && err.message === "LOAD_TIMEOUT"
            ? dict.agriacademy.unableToLoadCourse
            : err instanceof Error
              ? err.message
              : dict.agriacademy.unableToLoadCourse
        );
        setCourse(null);
        return null;
      }
    },
    [applyCourseTree, courseId, dict.agriacademy.unableToLoadCourse]
  );

  useEffect(() => {
    void loadCourse({ showLoading: true });
  }, [courseId, loadCourse]);

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

    if (!result.success) {
      setSaveState("error");
      setSaveError(mutationMessage(result.code, result.error));
      return;
    }

    const tree = await loadCourse({ showLoading: false });
    if (!tree) {
      setSaveState("error");
      setSaveError(dict.agriacademy.unableToSave);
      return;
    }

    const now = new Date();
    setLastSavedAt(now);
    setSaveState("success");
    setMessage(dict.agriacademy.draftSaved);

    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setSaveState("idle");
      setMessage(null);
    }, 3000);
  };

  const runAction = async (
    action: () => Promise<unknown>,
    success: string,
    options?: { require?: (data: unknown) => boolean }
  ): Promise<boolean> => {
    if (mutating || deleteBusy) return false;
    setMutating(true);
    setError(null);
    setMessage(null);
    try {
      const raw = await action();
      if (isMutationResult(raw)) {
        if (!raw.success) {
          setError(mutationMessage(raw.code, raw.error));
          return false;
        }
        if (options?.require && !options.require(raw.data)) {
          setError(dict.agriacademy.mutationDatabaseError);
          return false;
        }
      } else if (raw == null) {
        setError(dict.agriacademy.unableToSave);
        return false;
      }

      await loadCourse({ showLoading: false });
      setMessage(success);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : dict.agriacademy.unableToSave;
      setError(msg);
      return false;
    } finally {
      setMutating(false);
    }
  };

  const openDeleteDialog = () => {
    if (!course || isSaving) return;
    setDeleteError(null);
    setDeleteDialog(deleteDialogForStatus(course.status));
  };

  const closeDeleteDialog = () => {
    if (deleteBusy) return;
    setDeleteDialog(null);
    setDeleteError(null);
  };

  const confirmPermanentDelete = async () => {
    if (!course || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const result = await deleteCourseAction(course.id);
      if (!result.success) {
        setDeleteError(deleteMessage(result.code, result.error));
        return;
      }
      router.push("/dashboard/academy?courseDeleted=1");
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : dict.agriacademy.deleteUnknownError
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  const removeFromPublication = async () => {
    if (!course || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const result = await pauseCourseAction(course.id);
      if (!result.success) {
        setDeleteError(mutationMessage(result.code, result.error));
        return;
      }
      if (result.data.status !== "paused") {
        setDeleteError(dict.agriacademy.mutationDatabaseError);
        return;
      }
      await loadCourse({ showLoading: false });
      setDeleteDialog("confirm_after_pause");
    } catch (err: unknown) {
      setDeleteError(
        err instanceof Error ? err.message : dict.agriacademy.mutationDatabaseError
      );
    } finally {
      setDeleteBusy(false);
    }
  };

  if (loadState === "loading") {
    return <p className="text-sm text-muted-foreground">{dict.common.loading}</p>;
  }

  if (loadState === "not_found") {
    return (
      <div className="space-y-3 rounded-3xl border border-border bg-surface-card p-6">
        <p className="text-sm font-semibold text-destructive">{dict.agriacademy.courseNotFound}</p>
        <Link href="/dashboard/academy" className="text-xs font-bold text-primary hover:underline">
          ← {dict.agriacademy.courseCreatorTitle}
        </Link>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="space-y-3 rounded-3xl border border-border bg-surface-card p-6">
        <p className="text-sm font-semibold text-destructive">
          {loadError || dict.agriacademy.unableToLoadCourse}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => void loadCourse({ showLoading: true })}>
          {dict.common.retry}
        </Button>
      </div>
    );
  }

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
            <Badge variant="pillarAcademy">{statusLabels[course.status] || course.status}</Badge>
            {isDirty && (
              <span className="text-[11px] font-semibold text-amber-600">
                • {dict.agriacademy.unsavedChanges}
              </span>
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
            placeholder={dict.agriacademy.courseDescriptionPlaceholder}
            className="w-full min-h-20 text-sm bg-surface rounded-2xl border border-border p-3"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={saveState === "success" ? "primary" : "outline"}
            onClick={() => void handleSaveDraft()}
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
              onClick={() =>
                void runAction(
                  () => publishCourseAction(course.id),
                  dict.agriacademy.coursePublished,
                  { require: (data) => (data as { status?: string } | undefined)?.status === "published" }
                )
              }
              disabled={isSaving}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />
              {dict.common.publish}
            </Button>
          ) : null}
          {course.status === "published" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void runAction(
                  () => pauseCourseAction(course.id),
                  dict.agriacademy.coursePaused,
                  { require: (data) => (data as { status?: string } | undefined)?.status === "paused" }
                )
              }
              disabled={isSaving}
            >
              <Pause className="w-3.5 h-3.5 mr-1" />
              {dict.agriacademy.statusPaused}
            </Button>
          ) : null}
          {course.status === "paused" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void runAction(
                  () => resumeCourseAction(course.id),
                  dict.agriacademy.courseResumed,
                  { require: (data) => (data as { status?: string } | undefined)?.status === "published" }
                )
              }
              disabled={isSaving}
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              {dict.agriacademy.courseResumed.replace(".", "")}
            </Button>
          ) : null}
          {course.status !== "archived" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                void runAction(() => archiveCourseAction(course.id), dict.agriacademy.courseArchived)
              }
              disabled={isSaving}
            >
              <Archive className="w-3.5 h-3.5 mr-1" />
              {dict.agriacademy.statusArchived}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={openDeleteDialog}
          disabled={isSaving}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          {deleteBusy ? dict.agriacademy.deletingCourse : dict.agriacademy.deleteCourse}
        </Button>
      </div>

      {message && (saveState === "success" || (!saveError && !error)) && (
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
                  void runAction(
                    () => updateSectionAction(section.id, section.title),
                    dict.agriacademy.chapterUpdated
                  )
                }
                className="flex-1 font-bold bg-transparent border-b border-border focus:outline-none"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSaving}
                onClick={() =>
                  void runAction(() => deleteSectionAction(section.id), dict.agriacademy.chapterRemoved)
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
                      void runAction(
                        () => updateLessonAction(lesson.id, { title: lesson.title }),
                        dict.agriacademy.lessonUpdated
                      )
                    }
                    className="flex-1 min-w-[160px] text-sm bg-transparent border-b border-border focus:outline-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => setVideoLessonId(lesson.id)}
                  >
                    {lesson.youtube_video_id
                      ? dict.agriacademy.replaceVideo
                      : dict.agriacademy.selectVideo}
                  </Button>
                  {lesson.youtube_video_id ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() =>
                        void runAction(
                          () => assignLessonYouTubeAction(lesson.id, null),
                          dict.agriacademy.videoRemoved,
                          { require: (data) => (data as { youtube_video_id?: string | null }).youtube_video_id == null }
                        )
                      }
                    >
                      {dict.agriacademy.removeVideo}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() =>
                      void runAction(() => deleteLessonAction(lesson.id), dict.agriacademy.lessonRemoved)
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  {lesson.youtube_video_id ? (
                    <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                      {lesson.youtube_video_id}
                    </span>
                  ) : null}
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isSaving}
                onClick={() =>
                  void runAction(
                    () => createLessonAction(section.id, dict.agriacademy.newLesson),
                    dict.agriacademy.lessonAdded
                  )
                }
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {dict.agriacademy.addLesson}
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          disabled={isSaving}
          onClick={() =>
            void runAction(
              () => createSectionAction(course.id, dict.agriacademy.newChapter),
              dict.agriacademy.chapterAdded
            )
          }
        >
          <Plus className="w-4 h-4 mr-1.5" />
          {dict.agriacademy.addChapter}
        </Button>
      </div>

      <Link href="/dashboard/academy" className="text-xs font-bold text-primary hover:underline">
        ← {dict.agriacademy.backToCourseCreator}
      </Link>

      <LessonYouTubeModal
        open={Boolean(videoLessonId)}
        initialUrl={
          course?.sections
            .flatMap((section) => section.lessons)
            .find((lesson) => lesson.id === videoLessonId)?.youtube_source_url
          || course?.sections
            .flatMap((section) => section.lessons)
            .find((lesson) => lesson.id === videoLessonId)?.youtube_video_id
        }
        onClose={() => setVideoLessonId(null)}
        onSave={(urlOrId) => {
          if (!videoLessonId) return;
          const lessonId = videoLessonId;
          setVideoLessonId(null);
          void runAction(
            () => assignLessonYouTubeAction(lessonId, urlOrId),
            dict.agriacademy.videoAssigned,
            { require: (data) => Boolean((data as { youtube_video_id?: string | null }).youtube_video_id) }
          );
        }}
      />

      <CourseConfirmDialog
        open={deleteDialog === "confirm_delete" || deleteDialog === "confirm_after_pause"}
        title={
          deleteDialog === "confirm_after_pause"
            ? dict.agriacademy.unpublishThenDeleteTitle
            : dict.agriacademy.deleteCourseConfirmTitle
        }
        message={
          deleteDialog === "confirm_after_pause"
            ? dict.agriacademy.unpublishThenDeleteMessage
            : dict.agriacademy.deleteCourseConfirmMessage
        }
        confirmLabel={
          deleteDialog === "confirm_after_pause"
            ? dict.agriacademy.deletePermanently
            : dict.agriacademy.deleteCourse
        }
        confirmVariant="destructive"
        loading={deleteBusy}
        error={deleteError}
        onConfirm={() => void confirmPermanentDelete()}
        onCancel={closeDeleteDialog}
      />

      <CourseConfirmDialog
        open={deleteDialog === "published_block"}
        title={dict.agriacademy.publishedCourseTitle}
        message={dict.agriacademy.publishedCourseDeleteMessage}
        confirmLabel={dict.agriacademy.removeFromPublication}
        loading={deleteBusy}
        error={deleteError}
        onConfirm={() => void removeFromPublication()}
        onCancel={closeDeleteDialog}
      />
    </div>
  );
}
