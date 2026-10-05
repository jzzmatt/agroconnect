import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ANGOLA_PROVINCES } from "@/config/locations";
import { resolveProvinceCode } from "@/lib/geographic/province-normalization";

describe("Angola agricultural atlas geographic layer", () => {
  it("ships vector GeoJSON with 21 province features", () => {
    const file = path.join(process.cwd(), "src/lib/geographic/angola-provinces.json");
    const geo = JSON.parse(fs.readFileSync(file, "utf8"));
    expect(geo.features).toHaveLength(21);
    const codes = geo.features.map((f: { properties: { code: string } }) => f.properties.code).sort();
    expect(codes).toEqual(ANGOLA_PROVINCES.map((p) => p.code).sort());
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
