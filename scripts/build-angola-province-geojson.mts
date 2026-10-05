/**
 * Builds public/geo/angola-provinces.geojson (21 provinces) from geoBoundaries ADM1 (18).
 * New 2025 provinces use approximate bbox clips until official ADM1 vectors are published.
 * Source: geoBoundaries gbOpen AGO ADM1 (U.S. Census Bureau, Public Domain).
 */
import fs from "node:fs";
import path from "node:path";
import * as turf from "@turf/turf";
import { rewindIfInverted } from "../src/lib/geographic/rewind-polygons";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

const SOURCE_URL =
  "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/AGO/ADM1/geoBoundaries-AGO-ADM1_simplified.geojson";

const OUT_PUBLIC = path.join(process.cwd(), "public/geo/angola-provinces.geojson");
const OUT_BUNDLED = path.join(process.cwd(), "src/lib/geographic/angola-provinces.json");

const SHAPE_TO_CODE: Record<string, string> = {
  Bengo: "BGO",
  Benguela: "BGU",
  Bié: "BIE",
  Cabinda: "CAB",
  Cunene: "CNN",
  Huambo: "HUA",
  Huíla: "HUI",
  "Cuando Cubango": "CCU",
  "Cuanza Norte": "CNO",
  "Cuanza Sul": "CUS",
  Luanda: "LUA",
  "Lunda Norte": "LNO",
  "Lunda Sul": "LSU",
  Malanje: "MAL",
  Moxico: "MOX",
  Namibe: "NAM",
  Uíge: "UIG",
  Zaire: "ZAI",
};

function clipFeature(
  feature: Feature<Polygon | MultiPolygon>,
  bbox: turf.helpers.BBox,
  code: string,
  name: string
): Feature<Polygon | MultiPolygon> | null {
  const box = turf.bboxPolygon(bbox);
  const clipped = turf.intersect(
    turf.featureCollection([feature, box as Feature<Polygon>])
  );
  if (!clipped) return null;
  clipped.properties = {
    id: `AO-${code}`,
    code,
    name,
    geometrySource: "approximate-clip",
  };
  return clipped as Feature<Polygon | MultiPolygon>;
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Failed to download source GeoJSON: ${res.status}`);
  const source = (await res.json()) as FeatureCollection;

  const outFeatures: Feature[] = [];

  for (const feature of source.features) {
    const shapeName = String(feature.properties?.shapeName ?? "");
    const code = SHAPE_TO_CODE[shapeName];
    if (!code) {
      console.warn("Unknown shape:", shapeName);
      continue;
    }

    if (code === "CCU") {
      const ccu = feature as Feature<Polygon | MultiPolygon>;
      const cubango = clipFeature(ccu, [13.4, -18.6, 19.15, -13.8], "CUB", "Cubango");
      const cuando = clipFeature(ccu, [19.05, -18.6, 23.8, -13.8], "CUA", "Cuando");
      if (cubango) outFeatures.push(cubango);
      if (cuando) outFeatures.push(cuando);
      continue;
    }

    if (code === "LUA") {
      const lua = feature as Feature<Polygon | MultiPolygon>;
      const ieb = clipFeature(lua, [13.05, -9.45, 14.15, -8.75], "IEB", "Icolo e Bengo");
      if (ieb) outFeatures.push(ieb);
      const mainland = clipFeature(lua, [13.05, -9.45, 14.15, -8.05], "LUA", "Luanda");
      if (mainland) outFeatures.push(mainland);
      else {
        feature.properties = { id: "AO-LUA", code: "LUA", name: "Luanda", geometrySource: "geoboundaries-adm1" };
        outFeatures.push(feature);
      }
      continue;
    }

    if (code === "MOX") {
      const mox = feature as Feature<Polygon | MultiPolygon>;
      const mxl = clipFeature(mox, [20.0, -14.5, 24.5, -10.5], "MXL", "Moxico Leste");
      if (mxl) outFeatures.push(mxl);
      const moxico = clipFeature(mox, [13.5, -14.5, 20.05, -10.5], "MOX", "Moxico");
      if (moxico) outFeatures.push(moxico);
      continue;
    }

    feature.properties = {
      id: `AO-${code}`,
      code,
      name: shapeName,
      geometrySource: "geoboundaries-adm1",
    };
    outFeatures.push(feature);
  }

  if (outFeatures.length !== 21) {
    throw new Error(`Expected 21 province features, got ${outFeatures.length}`);
  }

  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features: outFeatures.map((feature) => rewindIfInverted(feature)),
  };

  const payload = JSON.stringify(collection);
  fs.mkdirSync(path.dirname(OUT_PUBLIC), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_BUNDLED), { recursive: true });
  fs.writeFileSync(OUT_PUBLIC, payload);
  fs.writeFileSync(OUT_BUNDLED, payload);
  console.log(`Wrote ${OUT_PUBLIC} and ${OUT_BUNDLED} (${outFeatures.length} features)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
