import { createPublicServerSupabaseClient } from "@/lib/supabase/client";
import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";
import type { CourseEnrollmentRecord } from "@/types/agriacademy";
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
