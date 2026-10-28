import { describe, expect, it } from "vitest";
import { conservativeRadiusBounds, isInsideRadiusBounds } from "@/lib/geospatial/radius-bounds";
import { wgs84Direct, wgs84DistanceMetres, type GeographicCoordinate } from "@/lib/geospatial/wgs84-distance";

describe("conservative radius bounds", () => {
  const centers: GeographicCoordinate[] = [
    { latitude: -8.8383, longitude: 13.2344 },
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 179.9 },
    { latitude: 0, longitude: -179.9 },
    { latitude: 89.2, longitude: 40 },
    { latitude: -89.2, longitude: -20 },
    { latitude: 80, longitude: 180 },
  ];
  const radii = [0, 10, 50_000, 200_000, 1_000_000];

  it("keeps every exact-distance hit inside the candidate box", () => {
    for (const center of centers) {
      for (const radius of radii) {
        const bounds = conservativeRadiusBounds(center, radius);
        for (const azimuth of [0, 45, 90, 135, 180, 225, 270, 315]) {
          const onBoundary = wgs84Direct(center, azimuth, radius);
          const inside = wgs84Direct(center, azimuth, radius * 0.5);
          expect(isInsideRadiusBounds(onBoundary, bounds), `${center.latitude},${center.longitude} ${radius} ${azimuth}`).toBe(true);
          expect(isInsideRadiusBounds(inside, bounds)).toBe(true);
          expect(wgs84DistanceMetres(center, onBoundary)).toBeLessThanOrEqual(radius + 1e-4);
        }
      }
    }
  });

  it("has no false negatives against a full ellipsoidal scan of deterministic samples", () => {
    const random = mulberry32(20261028);
    for (const center of centers) {
      for (const radius of [1_000, 50_000, 200_000]) {
        const bounds = conservativeRadiusBounds(center, radius);
        const samples = sampleAround(center, radius * 1.5, 300, random);
        for (const sample of samples) {
          const distance = wgs84DistanceMetres(center, sample);
          if (distance <= radius) {
            expect(isInsideRadiusBounds(sample, bounds)).toBe(true);
          }
        }
      }
    }
  });

  it("splits longitude across the antimeridian and drops a point several kilometres outside", () => {
    const center = { latitude: 0, longitude: 179.5 };
    const bounds = conservativeRadiusBounds(center, 100_000);
    expect(bounds.longitudeRanges).not.toBe("all");
    const east = wgs84Direct(center, 90, 100_000);
    const tooFar = wgs84Direct(center, 90, 130_000);
    expect(east.longitude).toBeLessThan(0);
    expect(isInsideRadiusBounds(east, bounds)).toBe(true);
    expect(isInsideRadiusBounds(tooFar, bounds)).toBe(false);
  });

  it("stops filtering longitude when the search reaches a pole", () => {
    const bounds = conservativeRadiusBounds({ latitude: 89.5, longitude: 10 }, 100_000);
    expect(bounds.longitudeRanges).toBe("all");
    expect(isInsideRadiusBounds({ latitude: 89.9, longitude: -170 }, bounds)).toBe(true);
  });
});

function sampleAround(
  center: GeographicCoordinate,
  reachMetres: number,
  count: number,
  random: () => number,
): GeographicCoordinate[] {
  const samples: GeographicCoordinate[] = [];
  for (let index = 0; index < count; index += 1) {
    const azimuth = random() * 360;
    const distance = random() * reachMetres;
    samples.push(wgs84Direct(center, azimuth, distance));
  }
  return samples;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
