import { describe, expect, it } from "vitest";
import {
  INCLUSION_EPSILON_METRES,
  WGS84_EQUATORIAL_RADIUS_METRES,
  coerceGeographyCoordinate,
  inspectCoordinate,
  withinRadius,
  wgs84Direct,
  wgs84DistanceMetres,
} from "@/lib/geospatial/wgs84-distance";

const LUANDA = { latitude: -8.8383, longitude: 13.2344 };

describe("WGS84 geodesic distance", () => {
  it("uses the WGS84 ellipsoid and a quarter equatorial arc", () => {
    const quarter = wgs84DistanceMetres(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 90 },
    );
    expect(WGS84_EQUATORIAL_RADIUS_METRES).toBe(6378137);
    expect(Math.abs(quarter - (WGS84_EQUATORIAL_RADIUS_METRES * Math.PI) / 2)).toBeLessThan(1e-6);
  });

  it("returns zero for identical coordinates and the input length from the direct problem", () => {
    expect(wgs84DistanceMetres(LUANDA, LUANDA)).toBe(0);
    const moved = wgs84Direct(LUANDA, 0, 50000);
    const distance = wgs84DistanceMetres(LUANDA, moved);
    expect(Math.abs(distance - 50000)).toBeLessThan(1e-6);
  });

  it("keeps full precision and does not round before the radius comparison", () => {
    const moved = wgs84Direct(LUANDA, 0, 50000);
    const distance = wgs84DistanceMetres(LUANDA, moved);
    expect(Number.isInteger(distance)).toBe(false);
    expect(withinRadius(distance, 50000)).toBe(true);
    expect(withinRadius(50000 + 0.001, 50000)).toBe(false);
    expect(INCLUSION_EPSILON_METRES).toBeLessThan(0.001);
  });

  it("crosses the antimeridian and the pole", () => {
    const east = wgs84Direct({ latitude: 0, longitude: 179.5 }, 90, 200000);
    expect(east.longitude).toBeLessThan(-170);
    const across = wgs84DistanceMetres({ latitude: 0, longitude: 179.5 }, east);
    expect(Math.abs(across - 200000)).toBeLessThan(1e-4);

    const overPole = wgs84Direct({ latitude: 89.5, longitude: 13 }, 0, 120000);
    expect(overPole.latitude).toBeLessThan(89.5);
    expect(Math.abs(wgs84DistanceMetres({ latitude: 89.5, longitude: 13 }, overPole) - 120000)).toBeLessThan(1e-4);
  });

  it("rejects missing, non-finite, and out-of-range inputs", () => {
    expect(inspectCoordinate(null, 10).ok).toBe(false);
    expect(inspectCoordinate(Number.NaN, 10)).toMatchObject({ ok: false, issue: "non_finite" });
    expect(inspectCoordinate(Number.POSITIVE_INFINITY, 10)).toMatchObject({ ok: false, issue: "non_finite" });
    expect(inspectCoordinate(95, 10)).toMatchObject({ ok: false, issue: "out_of_range" });
    expect(() => wgs84DistanceMetres(LUANDA, { latitude: 95, longitude: 10 })).toThrow(/valid/);
  });

  it("folds latitude and wraps longitude the way PostGIS geography did on 28 October 2026", () => {
    expect(coerceGeographyCoordinate(95, 13.2344)).toMatchObject({ latitude: 85, longitude: 13.2344, coerced: true });
    expect(coerceGeographyCoordinate(-95, 13.2344).latitude).toBe(-85);
    expect(coerceGeographyCoordinate(100, 10).latitude).toBe(80);
    expect(coerceGeographyCoordinate(180, 10).latitude).toBe(0);
    expect(coerceGeographyCoordinate(270, 10).latitude).toBe(-90);
    expect(coerceGeographyCoordinate(300, 10).latitude).toBe(-60);
    expect(coerceGeographyCoordinate(-100, 10).latitude).toBe(-80);
    expect(coerceGeographyCoordinate(0, 200).longitude).toBe(-160);
    expect(coerceGeographyCoordinate(95, 200)).toMatchObject({ latitude: 85, longitude: -160 });
    expect(coerceGeographyCoordinate(0, 181).longitude).toBe(-179);
    expect(coerceGeographyCoordinate(0, -190).longitude).toBe(170);
    expect(coerceGeographyCoordinate(0, 540).longitude).toBe(180);
    expect(coerceGeographyCoordinate(0, -540).longitude).toBe(180);
    expect(coerceGeographyCoordinate(0, -180)).toMatchObject({ longitude: -180, coerced: false });
    expect(coerceGeographyCoordinate(0, 180)).toMatchObject({ longitude: 180, coerced: false });
    expect(coerceGeographyCoordinate(0, 180.0000001).longitude).toBeCloseTo(-179.9999999, 6);
    expect(coerceGeographyCoordinate(0, -180.0000001).longitude).toBeCloseTo(179.9999999, 6);
  });
});
