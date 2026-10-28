import { describe, expect, it } from "vitest";
import { pointPolygonRelation, polygonPolygonRelation } from "@/lib/geospatial/polygon-relations";

const SQUARE = [
  [13.2, -8.9],
  [13.3, -8.9],
  [13.3, -8.8],
  [13.2, -8.8],
  [13.2, -8.9],
] as const;

describe("application-layer polygon relations", () => {
  it("matches the PostGIS baseline for contains and intersects", () => {
    const inside = pointPolygonRelation(SQUARE, 13.25, -8.85);
    const boundary = pointPolygonRelation(SQUARE, 13.2, -8.85);
    const outside = pointPolygonRelation(SQUARE, 13.1, -8.85);
    expect(inside).toEqual({ valid: true, contains: true, intersects: true });
    expect(boundary).toEqual({ valid: true, contains: false, intersects: true });
    expect(outside).toEqual({ valid: true, contains: false, intersects: false });
  });

  it("treats a shared edge as intersection without area overlap", () => {
    const overlap = polygonPolygonRelation(SQUARE, [
      [13.25, -8.85],
      [13.4, -8.85],
      [13.4, -8.7],
      [13.25, -8.7],
      [13.25, -8.85],
    ]);
    const edge = polygonPolygonRelation(SQUARE, [
      [13.3, -8.9],
      [13.4, -8.9],
      [13.4, -8.8],
      [13.3, -8.8],
      [13.3, -8.9],
    ]);
    const disjoint = polygonPolygonRelation(SQUARE, [
      [14, -9],
      [14.1, -9],
      [14.1, -8.9],
      [14, -8.9],
      [14, -9],
    ]);
    expect(overlap).toMatchObject({ valid: true, intersects: true, overlaps: true, touches: false });
    expect(edge).toMatchObject({ valid: true, intersects: true, touches: true, overlaps: false });
    expect(disjoint).toMatchObject({ valid: true, intersects: false, overlaps: false, touches: false });
  });

  it("rejects a self-intersecting ring and a ring that is not closed", () => {
    const bowtie = pointPolygonRelation(
      [
        [0, 0],
        [1, 1],
        [0, 1],
        [1, 0],
        [0, 0],
      ],
      0.5,
      0.5,
    );
    const open = pointPolygonRelation(
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ],
      0.5,
      0.5,
    );
    expect(bowtie.valid).toBe(false);
    expect(open.valid).toBe(false);
  });

  it("keeps an antimeridian ring on the planar interpretation used by geometry(Polygon, 4326)", () => {
    const ring = [
      [170, -1],
      [-170, -1],
      [-170, 1],
      [170, 1],
      [170, -1],
    ] as const;
    const throughPrime = pointPolygonRelation(ring, 0, 0);
    const nearDateLine = pointPolygonRelation(ring, 179, 0);
    expect(throughPrime).toMatchObject({ valid: true, contains: true, intersects: true });
    expect(nearDateLine).toMatchObject({ valid: true, contains: false, intersects: false });
  });
});
