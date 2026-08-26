"use server";

import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { authorize } from "@/lib/authorization/server";
import { AcademyAuthoringService } from "@/lib/academy/authoring-service";
import { validateCourseForPublication } from "@/lib/academy/publication-validation";
import { CourseService } from "@/lib/services/course-service";
import { AcademyVideoService } from "@/lib/services/academy-video-service";
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

export async function createCourseAction(input: CreateCourseInput): Promise<CourseRecord> {
  await authorize("academy.course.create");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Perfil não encontrado.");
  return CourseService.createCourse(userProfile.id, input);
}

export async function updateCourseAction(
  input: UpdateCourseInput
): Promise<{ success: boolean; course: CourseRecord | null; error?: string }> {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) {
    return { success: false, course: null, error: "Perfil não encontrado." };
  }
  try {
    const course = await CourseService.updateCourse(userProfile.id, input);
    if (!course) {
      return { success: false, course: null, error: "Não foi possível guardar o curso." };
    }
    return { success: true, course };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Não foi possível guardar o curso.";
    return { success: false, course: null, error: message };
  }
}

export async function getCourseEditorAction(courseId: string) {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return null;
  return AcademyAuthoringService.getCourseEditorTree(courseId, userProfile.id);
}

export async function publishCourseAction(courseId: string) {
  await authorize("academy.course.publish");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Perfil não encontrado.");

  const tree = await AcademyAuthoringService.getCourseEditorTree(courseId, userProfile.id);
  if (!tree) throw new Error("Curso não encontrado.");

  const validation = validateCourseForPublication(tree);
  if (!validation.ok) {
    throw new Error(validation.errors.join(" "));
  }

  return CourseService.updateCourse(userProfile.id, { id: courseId, status: "published" });
}

export async function pauseCourseAction(courseId: string) {
  await authorize("academy.course.publish");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Perfil não encontrado.");
  return CourseService.updateCourse(userProfile.id, { id: courseId, status: "paused" });
}

export async function resumeCourseAction(courseId: string) {
  await authorize("academy.course.publish");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Perfil não encontrado.");
  return CourseService.updateCourse(userProfile.id, { id: courseId, status: "published" });
}

export async function archiveCourseAction(courseId: string) {
  await authorize("academy.course.delete");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Perfil não encontrado.");
  return CourseService.updateCourse(userProfile.id, { id: courseId, status: "archived" });
}

export async function createSectionAction(courseId: string, title: string) {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return null;
  return AcademyAuthoringService.createSection(userProfile.id, courseId, title);
}

export async function updateSectionAction(sectionId: string, title: string) {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return null;
  return AcademyAuthoringService.updateSection(userProfile.id, sectionId, title);
}

export async function deleteSectionAction(sectionId: string) {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return false;
  return AcademyAuthoringService.deleteSection(userProfile.id, sectionId);
}

export async function reorderSectionsAction(courseId: string, orderedSectionIds: string[]) {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];
  return AcademyAuthoringService.reorderSections(userProfile.id, courseId, orderedSectionIds);
}

export async function createLessonAction(sectionId: string, title: string) {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return null;
  return AcademyAuthoringService.createLesson(userProfile.id, sectionId, title);
}

export async function updateLessonAction(
  lessonId: string,
  patch: { title?: string; description?: string | null }
) {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return null;
  return AcademyAuthoringService.updateLesson(userProfile.id, lessonId, patch);
}

export async function deleteLessonAction(lessonId: string) {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return false;
  return AcademyAuthoringService.deleteLesson(userProfile.id, lessonId);
}

export async function assignLessonVideoAction(lessonId: string, videoId: string | null) {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return null;
  return AcademyAuthoringService.assignLessonVideo(userProfile.id, lessonId, videoId);
}

export async function listMediaLibraryAction() {
  await authorize("academy.video.upload");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) return [];
  return AcademyVideoService.listByOwner(userProfile.id);
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
