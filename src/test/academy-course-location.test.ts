import { describe, expect, it } from "vitest";
import {
  courseHasMapLocation,
  isValidLatitude,
  isValidLongitude,
  validateCourseCoordinates,
} from "@/lib/academy/course-location";

describe("course location validation", () => {
  it("accepts valid coordinate pairs", () => {
    expect(validateCourseCoordinates(-12.5, 13.4)).toEqual({ ok: true });
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
  });

  it("rejects out-of-range coordinates", () => {
    expect(validateCourseCoordinates(91, 0).ok).toBe(false);
    expect(validateCourseCoordinates(0, 181).ok).toBe(false);
    expect(isValidLatitude(100)).toBe(false);
    expect(isValidLongitude(-200)).toBe(false);
  });

  it("allows both null for optional location", () => {
    expect(validateCourseCoordinates(null, null)).toEqual({ ok: true });
    expect(courseHasMapLocation({ latitude: null, longitude: null })).toBe(false);
  });

  it("requires both coordinates for map location", () => {
    expect(validateCourseCoordinates(1, null).ok).toBe(false);
    expect(courseHasMapLocation({ latitude: 1, longitude: null })).toBe(false);
    expect(courseHasMapLocation({ latitude: -12, longitude: 13 })).toBe(true);
  });
});
