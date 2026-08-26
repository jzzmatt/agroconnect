"use server";

import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { authorize } from "@/lib/authorization/server";
import { AcademyAuthoringService } from "@/lib/academy/authoring-service";
import { validateCourseForPublication } from "@/lib/academy/publication-validation";
import { CourseService } from "@/lib/services/course-service";
import {
  mutationFail,
  mutationOk,
  toCourseMutationFailure,
  type CourseMutationResult,
} from "@/lib/academy/course-errors";
import type {
  CourseListItem,
  CourseRecord,
  CreateCourseInput,
  UpdateCourseInput,
  SearchCoursesFilterParams,
} from "@/types/agriacademy";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import { CourseAccessService } from "@/lib/academy/course-access";
import { resolveStartLesson } from "@/lib/academy/course-navigation";

export async function searchPublishedCoursesAction(
  params: SearchCoursesFilterParams = {}
): Promise<{ courses: CourseListItem[]; total: number }> {
  return CourseService.searchPublishedCourses(params);
}

export async function getPublishedCourseBySlugAction(slug: string): Promise<CourseListItem | null> {
  return CourseService.getPublishedCourseBySlug(slug);
}

export async function listProviderPublishedCoursesAction(
  providerSlug: string,
  params: SearchCoursesFilterParams = {}
): Promise<{ courses: CourseListItem[]; total: number }> {
  return CourseService.listPublishedCoursesByProviderSlug(providerSlug, params);
}

export async function listMyCoursesAction(includeDrafts = true): Promise<CourseListItem[]> {
  await authorize("academy.course.create");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];
  return CourseService.listByOwner(userProfile.id, includeDrafts);
}

export async function createCourseAction(
  input: CreateCourseInput
): Promise<{ id: string; slug: string }> {
  await authorize("academy.course.create");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Perfil não encontrado.");
  const course = await CourseService.createCourse(userProfile.id, input);
  return { id: course.id, slug: course.slug };
}

export async function updateCourseAction(
  input: UpdateCourseInput
): Promise<CourseMutationResult<CourseRecord>> {
  try {
    await authorize("academy.course.update");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED", "Não tem permissão para alterar este curso.");
    return CourseService.updateCourse(userProfile.id, input);
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function getCourseEditorAction(courseId: string) {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return null;
  return AcademyAuthoringService.getCourseEditorTree(courseId, userProfile.id);
}

export async function publishCourseAction(courseId: string): Promise<CourseMutationResult<CourseRecord>> {
  try {
    await authorize("academy.course.publish");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");

    const tree = await AcademyAuthoringService.getCourseEditorTree(courseId, userProfile.id);
    if (!tree) return mutationFail("COURSE_NOT_FOUND");

    const validation = validateCourseForPublication(tree);
    if (!validation.ok) {
      return mutationFail("VALIDATION_ERROR", validation.errors.join(" "));
    }

    const updated = await CourseService.updateCourse(userProfile.id, { id: courseId, status: "published" });
    if (!updated.success) return updated;
    if (updated.data.status !== "published") {
      return mutationFail("DATABASE_ERROR", "Não foi possível publicar o curso. Tente novamente.");
    }
    return updated;
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function pauseCourseAction(courseId: string): Promise<CourseMutationResult<CourseRecord>> {
  try {
    await authorize("academy.course.publish");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    const updated = await CourseService.updateCourse(userProfile.id, { id: courseId, status: "paused" });
    if (!updated.success) return updated;
    if (updated.data.status !== "paused") {
      return mutationFail("DATABASE_ERROR", "Não foi possível retirar o curso da publicação.");
    }
    return updated;
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function resumeCourseAction(courseId: string): Promise<CourseMutationResult<CourseRecord>> {
  try {
    await authorize("academy.course.publish");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");

    const tree = await AcademyAuthoringService.getCourseEditorTree(courseId, userProfile.id);
    if (!tree) return mutationFail("COURSE_NOT_FOUND");
    const validation = validateCourseForPublication(tree);
    if (!validation.ok) {
      return mutationFail("VALIDATION_ERROR", validation.errors.join(" "));
    }

    const updated = await CourseService.updateCourse(userProfile.id, { id: courseId, status: "published" });
    if (!updated.success) return updated;
    if (updated.data.status !== "published") {
      return mutationFail("DATABASE_ERROR", "Não foi possível retomar o curso.");
    }
    return updated;
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function archiveCourseAction(courseId: string): Promise<CourseMutationResult<CourseRecord>> {
  try {
    await authorize("academy.course.delete");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    return CourseService.updateCourse(userProfile.id, { id: courseId, status: "archived" });
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function deleteCourseAction(courseId: string): Promise<CourseMutationResult<{ id: string }>> {
  try {
    await authorize("academy.course.delete");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) {
      return mutationFail("UNAUTHORIZED", "Não tem permissão para eliminar este curso.");
    }
    return CourseService.deleteCourse(userProfile.id, courseId);
  } catch (err: unknown) {
    return toCourseMutationFailure(err, "UNAUTHORIZED");
  }
}

export async function createSectionAction(courseId: string, title: string) {
  try {
    await authorize("academy.course.update");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    const section = await AcademyAuthoringService.createSection(userProfile.id, courseId, title);
    if (!section) return mutationFail("UNAUTHORIZED");
    return mutationOk(section);
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function updateSectionAction(sectionId: string, title: string) {
  try {
    await authorize("academy.course.update");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    const section = await AcademyAuthoringService.updateSection(userProfile.id, sectionId, title);
    if (!section) return mutationFail("COURSE_NOT_FOUND");
    return mutationOk(section);
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function deleteSectionAction(sectionId: string) {
  try {
    await authorize("academy.course.update");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    const deleted = await AcademyAuthoringService.deleteSection(userProfile.id, sectionId);
    if (!deleted) return mutationFail("COURSE_NOT_FOUND");
    return mutationOk({ deleted: true });
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function reorderSectionsAction(courseId: string, orderedSectionIds: string[]) {
  try {
    await authorize("academy.course.update");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    const sections = await AcademyAuthoringService.reorderSections(
      userProfile.id,
      courseId,
      orderedSectionIds
    );
    return mutationOk(sections);
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function createLessonAction(sectionId: string, title: string) {
  try {
    await authorize("academy.course.update");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    const lesson = await AcademyAuthoringService.createLesson(userProfile.id, sectionId, title);
    if (!lesson) return mutationFail("UNAUTHORIZED");
    return mutationOk(lesson);
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function updateLessonAction(
  lessonId: string,
  patch: { title?: string; description?: string | null }
) {
  try {
    await authorize("academy.course.update");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    const lesson = await AcademyAuthoringService.updateLesson(userProfile.id, lessonId, patch);
    if (!lesson) return mutationFail("COURSE_NOT_FOUND");
    return mutationOk(lesson);
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function deleteLessonAction(lessonId: string) {
  try {
    await authorize("academy.course.update");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    const deleted = await AcademyAuthoringService.deleteLesson(userProfile.id, lessonId);
    if (!deleted) return mutationFail("COURSE_NOT_FOUND");
    return mutationOk({ deleted: true });
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function assignLessonYouTubeAction(lessonId: string, urlOrId: string | null) {
  try {
    await authorize("academy.course.update");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    const lesson = await AcademyAuthoringService.assignLessonYouTubeVideo(
      userProfile.id,
      lessonId,
      urlOrId
    );
    if (!lesson) return mutationFail("UNAUTHORIZED");
    if (urlOrId !== null && urlOrId.trim() !== "" && !lesson.youtube_video_id) {
      return mutationFail("DATABASE_ERROR");
    }
    if ((urlOrId === null || urlOrId.trim() === "") && lesson.youtube_video_id != null) {
      return mutationFail("DATABASE_ERROR");
    }
    return mutationOk(lesson);
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function assignLessonVideoAction(lessonId: string, videoId: string | null) {
  return assignLessonYouTubeAction(lessonId, videoId);
}

export async function reorderLessonsAction(sectionId: string, orderedLessonIds: string[]) {
  try {
    await authorize("academy.course.update");
    const userProfile = await getCurrentUserProfile();
    if (!userProfile) return mutationFail("UNAUTHORIZED");
    const lessons = await AcademyAuthoringService.reorderLessons(
      userProfile.id,
      sectionId,
      orderedLessonIds
    );
    return mutationOk(lessons);
  } catch (err: unknown) {
    return toCourseMutationFailure(err);
  }
}

export async function getPublishedCourseDetailAction(slug: string) {
  return CourseService.getPublishedCourseDetailBySlug(slug);
}

export async function getCourseEnrollmentStatusAction(courseId: string) {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return { enrolled: false, authenticated: false };
  const status = await CourseAccessService.getEnrollmentStatus(userProfile.id, courseId);
  return { ...status, authenticated: true };
}

export async function getCourseLearnContextAction(slug: string, lessonId?: string | null) {
  const course = await CourseService.getPublishedCourseDetailBySlug(slug);
  if (!course) {
    return { allowed: false as const, reason: "not_found" as const };
  }

  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    return { allowed: false as const, reason: "auth_required" as const, course };
  }

  const enrolled = await EnrollmentService.isEnrolled(userProfile.id, course.id);
  const isOwner = course.owner_id === userProfile.id;
  if (!enrolled && !isOwner) {
    return { allowed: false as const, reason: "not_enrolled" as const, course };
  }

  const startLesson = resolveStartLesson(course, { lessonId });
  if (!startLesson) {
    return { allowed: false as const, reason: "no_lessons" as const, course };
  }

  return {
    allowed: true as const,
    course,
    startLesson,
    enrolled: true as const,
  };
}

export async function listMyEnrolledCourseIdsAction(): Promise<string[]> {
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];
  const enrollments = await EnrollmentService.listByStudent(userProfile.id);
  return enrollments.map((item) => item.course_id);
}

export async function enrollInCourseAction(courseId: string) {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Perfil não encontrado.");
  return EnrollmentService.enroll(userProfile.id, courseId);
}

export async function unenrollFromCourseAction(courseId: string) {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Perfil não encontrado.");
  return EnrollmentService.unenroll(userProfile.id, courseId);
}

export async function listMyEnrollmentsAction() {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];
  return EnrollmentService.listByStudent(userProfile.id);
}

export async function listCourseEnrollmentsAction(courseId: string) {
  await authorize("academy.students.view");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  const owned = await CourseService.listByOwner(userProfile.id, true);
  if (!owned.some((course) => course.id === courseId)) {
    throw new Error("Acesso negado.");
  }

  return EnrollmentService.listByCourse(courseId);
}

export async function listOwnedCourseStudentsAction(courseId: string) {
  await authorize("academy.students.view");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  const owned = await CourseService.listByOwner(userProfile.id, true);
  if (!owned.some((course) => course.id === courseId)) {
    throw new Error("Acesso negado.");
  }

  return EnrollmentService.listStudentsWithProfiles(courseId);
}

export async function getCourseCreatorDashboardAction() {
  await authorize("academy.course.create");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    return {
      draftCourses: [],
      publishedCourses: [],
    };
  }

  const courses = await CourseService.listByOwner(userProfile.id, true);
  const published = courses.filter((course) => course.status === "published");
  const drafts = courses.filter((course) => course.status !== "published" && course.status !== "archived");
  const counts = await EnrollmentService.countActiveByCourseIds(published.map((course) => course.id));

  return {
    draftCourses: drafts,
    publishedCourses: published.map((course) => ({
      ...course,
      studentCount: counts[course.id] ?? 0,
    })),
  };
}

export async function listMyEnrolledCoursesAction() {
  await requireAuth();
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];

  const enrollments = await EnrollmentService.listByStudent(userProfile.id);
  if (enrollments.length === 0) return [];

  const courseIds = enrollments.map((item) => item.course_id);
  const courses = await CourseService.getCoursesByIds(courseIds);
  const courseMap = new Map(courses.map((course) => [course.id, course]));

  return enrollments
    .map((enrollment) => {
      const course = courseMap.get(enrollment.course_id);
      if (!course) return null;
      return {
        enrollmentId: enrollment.id,
        enrolledAt: enrollment.enrolled_at,
        course,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}
