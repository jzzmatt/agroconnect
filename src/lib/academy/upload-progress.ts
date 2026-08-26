export type UploadProgressPhase = "transfer" | "bunny-receipt" | "encoding" | "ready";

const TRANSFER_WEIGHT = 40;
const RECEIPT_WEIGHT = 15;
const ENCODE_WEIGHT = 45;

/** Maps file transfer + Bunny encodeProgress into a single 0–100 UI value. */
export function computeBunnyUiProgress(params: {
  transferPercent: number;
  bunnyStatusCode: number;
  encodeProgress: number;
}): { percent: number; phase: UploadProgressPhase } {
  const transfer = Math.max(0, Math.min(1, params.transferPercent));

  if (transfer < 1) {
    return {
      percent: Math.max(4, Math.round(transfer * TRANSFER_WEIGHT)),
      phase: "transfer",
    };
  }

  if (params.bunnyStatusCode <= 0) {
    return { percent: TRANSFER_WEIGHT + 4, phase: "bunny-receipt" };
  }

  if (params.bunnyStatusCode === 1) {
    return { percent: TRANSFER_WEIGHT + RECEIPT_WEIGHT, phase: "bunny-receipt" };
  }

  if (params.bunnyStatusCode === 4) {
    return { percent: 100, phase: "ready" };
  }

  if (params.bunnyStatusCode === 5 || params.bunnyStatusCode === 6) {
    return { percent: TRANSFER_WEIGHT, phase: "bunny-receipt" };
  }

  const encode = Math.max(0, Math.min(100, params.encodeProgress));
  return {
    percent: TRANSFER_WEIGHT + RECEIPT_WEIGHT + Math.round((encode / 100) * ENCODE_WEIGHT),
    phase: "encoding",
  };
}
