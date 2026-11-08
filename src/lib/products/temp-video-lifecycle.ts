import { PRODUCT_VIDEO_MAX_SECONDS } from "@/config/product-catalog";
import { firstMinuteWindow } from "@/lib/products/video-validation";

export const TEMP_VIDEO_BUCKET = "agroproduct-temp-videos";
export const PERMANENT_VIDEO_BUCKET = "agroproduct-media";

export type TempVideoStatus =
  | "processing"
  | "saved"
  | "transferring"
  | "permanent_ready"
  | "transferred"
  | "cleanup_failed"
  | "deleted";

export interface TempVideoRecord {
  id: string;
  userId: string;
  productId: string | null;
  clientRequestId: string;
  status: TempVideoStatus;
  tempPath: string | null;
  permanentPath: string | null;
  mimeType: string;
  fileSize: number;
  durationSeconds: number;
  errorCode: string | null;
}

const REQUEST_ID = /^[A-Za-z0-9_-]{16,80}$/;

export function assertTempVideoRequestId(value: string) {
  if (!REQUEST_ID.test(value)) {
    throw Object.assign(new Error("INVALID_REQUEST"), { code: "INVALID_REQUEST" });
  }
}

export function processedClipEnd(durationSeconds: number): number {
  return firstMinuteWindow(durationSeconds).end;
}

export function keepsOriginalFile(durationSeconds: number, mimeType: string | null | undefined): boolean {
  const end = processedClipEnd(durationSeconds);
  const mime = (mimeType || "").split(";")[0].trim().toLowerCase();
  return end > 0 && end <= PRODUCT_VIDEO_MAX_SECONDS + 0.05 && durationSeconds <= PRODUCT_VIDEO_MAX_SECONDS + 0.05 && (mime === "video/mp4" || mime === "video/webm");
}

export type SaveDecision = "upload" | "return" | "busy";

export function decideSave(existing: TempVideoRecord | null): SaveDecision {
  if (!existing) return "upload";
  if (existing.status === "saved" || existing.status === "permanent_ready" || existing.status === "transferred") {
    return "return";
  }
  if (existing.status === "processing" || existing.status === "transferring") return "busy";
  return "upload";
}

export type PromoteDecision = "copy" | "reuse" | "reject";

export function decidePromote(record: TempVideoRecord, userId: string): PromoteDecision {
  if (record.userId !== userId) return "reject";
  if (record.status === "deleted") return "reject";
  if (
    (record.status === "permanent_ready" || record.status === "transferred" || record.status === "cleanup_failed") &&
    record.permanentPath
  ) {
    return "reuse";
  }
  if (record.status === "saved" || record.status === "transferring" || record.status === "processing") return "copy";
  return "reject";
}

export type CancelDecision = "delete_temp" | "already_deleted" | "keep" | "reject";

export function decideCancel(record: TempVideoRecord, userId: string): CancelDecision {
  if (record.userId !== userId) return "reject";
  if (record.status === "deleted") return "already_deleted";
  if (record.permanentPath || record.status === "permanent_ready" || record.status === "transferred") return "keep";
  if (record.status === "saved" || record.status === "processing" || record.status === "cleanup_failed") return "delete_temp";
  return "reject";
}

export type FinalizeDecision = "delete_temp" | "retry_delete" | "done" | "reject";

export function decideFinalize(record: TempVideoRecord, userId: string): FinalizeDecision {
  if (record.userId !== userId) return "reject";
  if (record.status === "transferred") return "done";
  if (record.status === "cleanup_failed") return "retry_delete";
  if (record.status === "permanent_ready" && record.permanentPath) return "delete_temp";
  return "reject";
}
