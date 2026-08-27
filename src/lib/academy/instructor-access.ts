export function requireOwnedCourseId(ownedCourseIds: string[], courseId: string): void {
  if (!courseId || !ownedCourseIds.includes(courseId)) {
    throw new Error("Acesso negado.");
  }
}
