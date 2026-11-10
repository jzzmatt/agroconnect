import { isUuid } from "@/lib/products/ids";
import { planTempVideoUpload } from "@/lib/products/temp-video-chunks";
import { validateProductVideo } from "@/lib/products/video-validation";

export const SERVICE_MEDIA_BUCKET = "service-media";
export const SERVICE_IMAGE_LIMIT = 8;

export function serviceImagePath(serviceId: string, imageId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/images/${encodeURIComponent(imageId)}`;
}

export function serviceVideoPath(serviceId: string): string {
  return `/api/services/${encodeURIComponent(serviceId)}/video`;
}

export function serviceMediaChunkPath(profileId: string, serviceId: string, requestId: string, index: number): string {
  if (!isUuid(profileId) || !isUuid(serviceId) || !isUuid(requestId) || !Number.isInteger(index) || index < 0) {
    throw Object.assign(new Error("INVALID_REQUEST"), { code: "INVALID_REQUEST" });
  }
  return `${profileId}/${serviceId}/chunks/${requestId}/${index}`;
}

export function serviceVideoObjectPath(profileId: string, serviceId: string, mimeType: string): string {
  if (!isUuid(profileId) || !isUuid(serviceId)) {
    throw Object.assign(new Error("INVALID_REQUEST"), { code: "INVALID_REQUEST" });
  }
  const extension = mimeType === "video/mp4" ? "mp4" : "webm";
  return `${profileId}/${serviceId}/video.${extension}`;
}

export function assertServiceVideo(params: {
  mimeType: string;
  fileSize: number;
  durationSeconds: number;
}): { mimeType: "video/mp4" | "video/webm"; durationSeconds: number } {
  const mime = params.mimeType === "video/mp4" ? "video/mp4" : "video/webm";
  const extension = mime === "video/mp4" ? "mp4" : "webm";
  const durationSeconds = Math.round(params.durationSeconds * 100) / 100;
  const valid = validateProductVideo({
    mimeType: mime,
    fileSize: params.fileSize,
    durationSeconds,
    fileName: `service.${extension}`,
  });
  if (!valid.ok) throw Object.assign(new Error(valid.code), { code: valid.code });
  planTempVideoUpload(params.fileSize);
  return { mimeType: mime, durationSeconds };
}
