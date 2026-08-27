import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";
import type { CourseEnrollmentRecord, CourseEnrollmentStudentRow } from "@/types/agriacademy";
import type { CourseEnrollmentStatus } from "@/types/database";

function hasLiveSupabase(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  );
}

/** In-memory enrollment store for tests/dev when Supabase is unavailable. */
const memoryEnrollments: CourseEnrollmentRecord[] = [];

async function getEnrollmentClient() {
  return tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
}

export class EnrollmentService {
  public static async enroll(studentId: string, courseId: string): Promise<CourseEnrollmentRecord> {
    const existing = await this.findEnrollment(studentId, courseId);
    if (existing && existing.status === "active") {
      return existing;
    }

    const now = new Date().toISOString();
    const record: CourseEnrollmentRecord = {
      id: `enr-${Date.now()}`,
      course_id: courseId,
      student_id: studentId,
      status: "active",
      enrolled_at: now,
      completed_at: null,
      last_lesson_id: null,
      created_at: now,
      updated_at: now,
    };

    if (hasLiveSupabase()) {
      const supabase = await getEnrollmentClient();
      const { data, error } = await (supabase.from("course_enrollments") as any)
        .upsert(
          {
            course_id: courseId,
            student_id: studentId,
            status: "active",
            enrolled_at: now,
          },
          { onConflict: "course_id,student_id" }
        )
        .select()
        .single();

      if (error) {
        throw new Error(error.message || "Não foi possível guardar a inscrição.");
      }
      if (data) {
        return data as CourseEnrollmentRecord;
      }
      throw new Error("Não foi possível guardar a inscrição.");
    }

    const idx = memoryEnrollments.findIndex(
      (item) => item.course_id === courseId && item.student_id === studentId
    );
    if (idx >= 0) {
      memoryEnrollments[idx] = { ...memoryEnrollments[idx], status: "active", updated_at: now };
      return memoryEnrollments[idx];
    }
    memoryEnrollments.push(record);
    return record;
  }

  public static async unenroll(studentId: string, courseId: string): Promise<boolean> {
    if (hasLiveSupabase()) {
      const supabase = await getEnrollmentClient();
      const { error } = await (supabase.from("course_enrollments") as any)
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("course_id", courseId)
        .eq("student_id", studentId);
      if (!error) return true;
      return false;
    }

    const idx = memoryEnrollments.findIndex(
      (item) => item.course_id === courseId && item.student_id === studentId
    );
    if (idx < 0) return false;
    memoryEnrollments[idx] = {
      ...memoryEnrollments[idx],
      status: "cancelled",
      updated_at: new Date().toISOString(),
    };
    return true;
  }

  public static async listByStudent(
    studentId: string,
    status: CourseEnrollmentStatus = "active"
  ): Promise<CourseEnrollmentRecord[]> {
    if (hasLiveSupabase()) {
      const supabase = await getEnrollmentClient();
      const { data, error } = await (supabase.from("course_enrollments") as any)
        .select("*")
        .eq("student_id", studentId)
        .eq("status", status)
        .order("enrolled_at", { ascending: false });
      if (!error && data) return data as CourseEnrollmentRecord[];
    }

    return memoryEnrollments.filter(
      (item) => item.student_id === studentId && item.status === status
    );
  }

  public static async listByCourse(
    courseId: string,
    status: CourseEnrollmentStatus = "active"
  ): Promise<CourseEnrollmentRecord[]> {
    if (hasLiveSupabase()) {
      const supabase = await getEnrollmentClient();
      const { data, error } = await (supabase.from("course_enrollments") as any)
        .select("*")
        .eq("course_id", courseId)
        .eq("status", status)
        .order("enrolled_at", { ascending: false });
      if (!error && data) return data as CourseEnrollmentRecord[];
    }

    return memoryEnrollments.filter(
      (item) => item.course_id === courseId && item.status === status
    );
  }

  public static async isEnrolled(studentId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.findEnrollment(studentId, courseId);
    return enrollment?.status === "active";
  }

  public static async getActiveEnrollment(
    studentId: string,
    courseId: string
  ): Promise<CourseEnrollmentRecord | null> {
    const enrollment = await this.findEnrollment(studentId, courseId);
    if (enrollment?.status !== "active") return null;
    return enrollment;
  }

  public static async recordLastLesson(
    studentId: string,
    courseId: string,
    lessonId: string
  ): Promise<CourseEnrollmentRecord | null> {
    const enrollment = await this.getActiveEnrollment(studentId, courseId);
    if (!enrollment) return null;
    const now = new Date().toISOString();

    if (hasLiveSupabase()) {
      const supabase = await getEnrollmentClient();
      const { data, error } = await (supabase.from("course_enrollments") as any)
        .update({ last_lesson_id: lessonId, updated_at: now })
        .eq("id", enrollment.id)
        .eq("student_id", studentId)
        .select()
        .single();
      if (error || !data) return null;
      return data as CourseEnrollmentRecord;
    }

    const idx = memoryEnrollments.findIndex((item) => item.id === enrollment.id);
    if (idx < 0) return null;
    memoryEnrollments[idx] = {
      ...memoryEnrollments[idx],
      last_lesson_id: lessonId,
      updated_at: now,
    };
    return memoryEnrollments[idx];
  }

  /** Aggregated active enrollment counts per course (single query). */
  public static async countActiveByCourseIds(courseIds: string[]): Promise<Record<string, number>> {
    if (courseIds.length === 0) return {};

    if (hasLiveSupabase()) {
      const supabase = await getEnrollmentClient();
      const { data, error } = await (supabase.from("course_enrollments") as any)
        .select("course_id")
        .in("course_id", courseIds)
        .eq("status", "active");
      if (!error && data) {
        const counts: Record<string, number> = {};
        for (const row of data as Array<{ course_id: string }>) {
          counts[row.course_id] = (counts[row.course_id] ?? 0) + 1;
        }
        return counts;
      }
    }

    const counts: Record<string, number> = {};
    for (const enrollment of memoryEnrollments) {
      if (enrollment.status !== "active" || !courseIds.includes(enrollment.course_id)) continue;
      counts[enrollment.course_id] = (counts[enrollment.course_id] ?? 0) + 1;
    }
    return counts;
  }

  /** Instructor-facing student list with profile email (private). */
  public static async listStudentsWithProfiles(
    courseId: string,
    status: CourseEnrollmentStatus = "active"
  ): Promise<CourseEnrollmentStudentRow[]> {
    if (hasLiveSupabase()) {
      const supabase = await getEnrollmentClient();
      const { data, error } = await (supabase.from("course_enrollments") as any)
        .select(
          `
          id,
          course_id,
          student_id,
          status,
          enrolled_at,
          profiles:student_id ( email, display_name )
        `
        )
        .eq("course_id", courseId)
        .eq("status", status)
        .order("enrolled_at", { ascending: false });

      if (!error && data) {
        return (data as Array<Record<string, unknown>>).map((row) => {
          const profile = row.profiles as { email?: string | null; display_name?: string | null } | null;
          return {
            enrollmentId: String(row.id),
            courseId: String(row.course_id),
            studentId: String(row.student_id),
            studentEmail: profile?.email ?? null,
            studentDisplayName: profile?.display_name ?? null,
            enrolledAt: String(row.enrolled_at),
            status: row.status as CourseEnrollmentStatus,
          };
        });
      }
    }

    return memoryEnrollments
      .filter((item) => item.course_id === courseId && item.status === status)
      .map((item) => ({
        enrollmentId: item.id,
        courseId: item.course_id,
        studentId: item.student_id,
        studentEmail: null,
        studentDisplayName: null,
        enrolledAt: item.enrolled_at,
        status: item.status,
      }));
  }

  private static async findEnrollment(
    studentId: string,
    courseId: string
  ): Promise<CourseEnrollmentRecord | null> {
    if (hasLiveSupabase()) {
      const supabase = await getEnrollmentClient();
      const { data, error } = await (supabase.from("course_enrollments") as any)
        .select("*")
        .eq("student_id", studentId)
        .eq("course_id", courseId)
        .maybeSingle();
      if (!error && data) return data as CourseEnrollmentRecord;
      if (!error) return null;
    }

    return (
      memoryEnrollments.find(
        (item) => item.student_id === studentId && item.course_id === courseId
      ) ?? null
    );
  }

  /** Test helper — clears in-memory enrollments. */
  public static resetMemoryStore(): void {
    memoryEnrollments.length = 0;
  }
}
