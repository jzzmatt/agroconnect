"use server";

import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { authorize } from "@/lib/authorization/server";
import {
  CourseService,
} from "@/lib/services/course-service";
import type { SearchCoursesFilterParams } from "@/types/agriacademy";
import { EnrollmentService } from "@/lib/services/enrollment-service";
import type { CourseListItem, CourseRecord, CreateCourseInput, UpdateCourseInput } from "@/types/agriacademy";

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

export async function updateCourseAction(input: UpdateCourseInput): Promise<CourseRecord | null> {
  await authorize("academy.course.update");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Perfil não encontrado.");
  return CourseService.updateCourse(userProfile.id, input);
}

export async function publishCourseAction(courseId: string): Promise<CourseRecord | null> {
  await authorize("academy.course.publish");
  const userProfile = await getCurrentUserProfile();
  if (!userProfile) throw new Error("Perfil não encontrado.");
  return CourseService.updateCourse(userProfile.id, { id: courseId, status: "published" });
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
  return EnrollmentService.listByCourse(courseId);
}
