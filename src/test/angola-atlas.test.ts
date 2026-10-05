import { describe, it, expect } from "vitest";
import { geoArea, geoCentroid, geoMercator, geoPath } from "d3-geo";
import fs from "node:fs";
import path from "node:path";
import { ANGOLA_PROVINCES } from "@/config/locations";
import { getAngolaProvinceGeoJson } from "@/lib/geographic/angola-province-geojson-data";
import { resolveProvinceCode } from "@/lib/geographic/province-normalization";

describe("Angola agricultural atlas geographic layer", () => {
  it("ships vector GeoJSON with 21 province features", () => {
    const file = path.join(process.cwd(), "src/lib/geographic/angola-provinces.json");
    const geo = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(geo.features).toHaveLength(21);
    const codes = geo.features.map((f: { properties: { code: string } }) => f.properties.code).sort();
    expect(codes).toEqual(ANGOLA_PROVINCES.map((p) => p.code).sort());
  });

  it("draws provinces as land, not the rest of the globe", () => {
    const geo = getAngolaProvinceGeoJson();
    for (const feature of geo.features) {
      expect(geoArea(feature)).toBeLessThan(1);
    }
  });

  it("fits Angola into the viewport with distinct province anchors", () => {
    const geo = getAngolaProvinceGeoJson();
    const width = 800;
    const height = 520;
    const projection = geoMercator().fitExtent(
      [
        [24, 24],
        [width - 24, height - 24],
      ],
      geo
    );
    expect(projection.scale()).toBeGreaterThan(800);

    const path = geoPath(projection);
    const points = geo.features.map((feature) => {
      const [lon, lat] = geoCentroid(feature);
      const [x, y] = path.centroid(feature);
      expect(lon).toBeGreaterThan(10);
      expect(lon).toBeLessThan(25);
      expect(lat).toBeLessThan(-4);
      expect(lat).toBeGreaterThan(-19);
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      return { code: String(feature.properties?.code), x, y };
    });

    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(250);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(300);

    const cabinda = points.find((p) => p.code === "CAB");
    const namibe = points.find((p) => p.code === "NAM");
    expect(cabinda && namibe).toBeTruthy();
    expect(Math.hypot(cabinda!.x - namibe!.x, cabinda!.y - namibe!.y)).toBeGreaterThan(200);
  });

  it("resolves legacy Cuando Cubango to Cubango", () => {
    expect(resolveProvinceCode("Cuando Cubango")).toBe("CUB");
    expect(resolveProvinceCode("CCU")).toBe("CUB");
  });

  it("tolerates accent-insensitive province lookup", () => {
    expect(resolveProvinceCode("Huila")).toBe("HUI");
    expect(resolveProvinceCode("Uige")).toBe("UIG");
  });
});
