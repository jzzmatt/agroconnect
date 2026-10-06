import { describe, expect, it } from "vitest";
import { projectGeoToScreen } from "./map-screen-coordinates";

describe("projectGeoToScreen", () => {
  const projection = ((coords: [number, number]) => [coords[0] * 10, coords[1] * 10]) as (
    coords: [number, number]
  ) => [number, number];

  it("applies map transform to projected coordinates", () => {
    const screen = projectGeoToScreen(
      { longitude: 13.58, latitude: -12.58 },
      projection,
      { x: 100, y: 50, k: 2 }
    );
    expect(screen).toEqual({ x: 100 + 2 * 135.8, y: 50 + 2 * -125.8 });
  });

  it("returns null when projection fails", () => {
    const failing = () => null;
    expect(
      projectGeoToScreen({ longitude: 0, latitude: 0 }, failing, { x: 0, y: 0, k: 1 })
    ).toBeNull();
  });
});
