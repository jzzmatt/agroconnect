import { DEMO_COURSES } from "./courses";
import { DEMO_MEDIA } from "./media";
import { DEMO_PRODUCTS } from "./products";
import { DEMO_PROVIDERS } from "./providers";
import { DEMO_SERVICES } from "./services";

export const SHOWCASE_BATCH_SLUG = "agroconnect-showcase";
export const SHOWCASE_BATCH_NAME = "Agroconnect Showcase";

export type ShowcaseRecordKind = "product" | "course" | "service" | "provider" | "media";

export interface ShowcaseRecord {
  recordKind: ShowcaseRecordKind;
  recordKey: string;
  mediaPath: string | null;
}

export function showcaseRecords(): ShowcaseRecord[] {
  const records: ShowcaseRecord[] = [
    ...DEMO_PRODUCTS.map((product) => ({
      recordKind: "product" as const,
      recordKey: product.id,
      mediaPath: null,
    })),
    ...DEMO_COURSES.map((course) => ({
      recordKind: "course" as const,
      recordKey: course.id,
      mediaPath: null,
    })),
    ...DEMO_SERVICES.map((service) => ({
      recordKind: "service" as const,
      recordKey: service.id,
      mediaPath: null,
    })),
    ...DEMO_PROVIDERS.map((provider) => ({
      recordKind: "provider" as const,
      recordKey: provider.id,
      mediaPath: null,
    })),
  ];

  for (const key of Object.keys(DEMO_MEDIA)) {
    records.push({
      recordKind: "media",
      recordKey: `demo-media-${key}`,
      mediaPath: `demo/${SHOWCASE_BATCH_SLUG}/${key}.svg`,
    });
  }
  return records;
}

export function demoBucketObjectPath(mediaPath: string): string | null {
  if (!mediaPath.startsWith("demo/") || mediaPath.includes("..") || mediaPath.includes("\\")) return null;
  const objectPath = mediaPath.slice("demo/".length);
  if (!objectPath || objectPath.startsWith("/")) return null;
  return objectPath;
}

export function isolatedDemoMediaPaths(paths: Array<string | null | undefined>): string[] {
  const unique = new Set<string>();
  for (const path of paths) {
    if (typeof path === "string" && demoBucketObjectPath(path)) unique.add(path);
  }
  return [...unique];
}
