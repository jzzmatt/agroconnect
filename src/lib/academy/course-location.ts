export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

export function validateCourseCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): { ok: true } | { ok: false; code: "INVALID_COORDINATES" } {
  if (latitude == null && longitude == null) return { ok: true };
  if (latitude == null || longitude == null) return { ok: false, code: "INVALID_COORDINATES" };
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return { ok: false, code: "INVALID_COORDINATES" };
  }
  return { ok: true };
}

export function courseHasMapLocation(course: {
  latitude?: number | null;
  longitude?: number | null;
}): boolean {
  if (course.latitude == null || course.longitude == null) return false;
  return validateCourseCoordinates(course.latitude, course.longitude).ok;
}
