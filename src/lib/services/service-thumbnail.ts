import { isUuid } from "@/lib/products/ids";

export const SERVICE_THUMBNAILS_BUCKET = "service-thumbnails";
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;

export interface ServiceThumbnailSource {
  id: string;
  title: string;
  description: string | null;
  provinceName: string | null;
  municipalityName: string | null;
  status: string;
  ownerProfileId: string;
}

export function serviceThumbnailPublicPath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/thumbnail`;
}

export function assertThumbnailPreviewId(value: string): string {
  if (!isUuid(value)) {
    throw Object.assign(new Error("INVALID_REQUEST"), { code: "INVALID_REQUEST" });
  }
  return value;
}

export function pendingServiceThumbnailPath(profileId: string, serviceId: string, previewId: string): string {
  return `pending/${assertThumbnailPreviewId(profileId)}/${assertThumbnailPreviewId(serviceId)}/${assertThumbnailPreviewId(previewId)}.jpg`;
}

export function savedServiceThumbnailPath(profileId: string, serviceId: string): string {
  return `${assertThumbnailPreviewId(profileId)}/${assertThumbnailPreviewId(serviceId)}/thumbnail.jpg`;
}

export function assertGeneratedThumbnail(bytes: Buffer): Buffer {
  if (bytes.length <= 0 || bytes.length > MAX_THUMBNAIL_BYTES) {
    throw Object.assign(new Error("THUMBNAIL_GENERATION_FAILED"), { code: "THUMBNAIL_GENERATION_FAILED" });
  }
  return bytes;
}

function clip(value: string | null | undefined, max: number): string | null {
  const text = value?.replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, max);
}

/** Square agricultural cover. The model must not paint words onto the image. */
export function serviceThumbnailPrompt(source: Pick<ServiceThumbnailSource, "title" | "description" | "provinceName" | "municipalityName">): string {
  const title = clip(source.title, 80) || "serviço agrícola";
  const description = clip(source.description, 180);
  const place = [clip(source.municipalityName, 40), clip(source.provinceName, 40)].filter(Boolean).join(", ");
  return [
    `Create a clear square photograph for an Angolan agricultural service named "${title}".`,
    description ? `The service is about: ${description}` : null,
    place ? `The setting is ${place}, Angola.` : "The setting is rural Angola.",
    "Show the work itself, such as fields, animals, tools, or a professional visit. No text, watermark, logo, or collage.",
  ].filter((line): line is string => Boolean(line)).join(" ");
}
