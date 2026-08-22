export const PRODUCT_ERROR_CODES = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  PLAN_NOT_ACTIVE: "PLAN_NOT_ACTIVE",
  FEATURE_NOT_AVAILABLE: "FEATURE_NOT_AVAILABLE",
  PRODUCT_CREATION_LOCKED: "PRODUCT_CREATION_LOCKED",
  PRODUCT_LIMIT_REACHED: "PRODUCT_LIMIT_REACHED",
  PRODUCT_FORBIDDEN: "PRODUCT_FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  PRODUCT_VALIDATION_FAILED: "PRODUCT_VALIDATION_FAILED",
  PRODUCT_CATEGORY_INVALID: "PRODUCT_CATEGORY_INVALID",
  PRODUCT_ANIMAL_INVALID: "PRODUCT_ANIMAL_INVALID",
  PRODUCT_LAND_INVALID: "PRODUCT_LAND_INVALID",
  PRODUCT_PUBLISH_FAILED: "PRODUCT_PUBLISH_FAILED",
  PRODUCT_PUBLISH_TIMEOUT: "PRODUCT_PUBLISH_TIMEOUT",
  PRODUCT_IMAGE_FAILED: "PRODUCT_IMAGE_FAILED",
  MEDIA_UPLOAD_FAILED: "MEDIA_UPLOAD_FAILED",
  BUNNY_NOT_CONFIGURED: "BUNNY_NOT_CONFIGURED",
  BUNNY_UPLOAD_FAILED: "BUNNY_UPLOAD_FAILED",
  PRODUCT_VIDEO_FORBIDDEN: "PRODUCT_VIDEO_FORBIDDEN",
  PRODUCT_VIDEO_INVALID: "PRODUCT_VIDEO_INVALID",
  PRODUCT_VIDEO_TOO_LONG: "PRODUCT_VIDEO_TOO_LONG",
  PRODUCT_VIDEO_TOO_LARGE: "PRODUCT_VIDEO_TOO_LARGE",
  VIDEO_OPTIMIZE_FAILED: "VIDEO_OPTIMIZE_FAILED",
  NETWORK_FAILED: "NETWORK_FAILED",
} as const;

export type ProductErrorCode = keyof typeof PRODUCT_ERROR_CODES;

export interface ProductActionResult<T = unknown> {
  success: boolean;
  code?: ProductErrorCode | string;
  message?: string;
  requestId?: string;
  data?: T;
}

export function createRequestId() {
  return `pub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logProductOperation(payload: {
  requestId: string;
  operation: string;
  userId?: string | null;
  productId?: string | null;
  category?: string | null;
  productType?: string | null;
  subscription?: string | null;
  subscriptionId?: string | null;
  subscriptionStatus?: string | null;
  entitlements?: string[] | null;
  productCount?: number | null;
  plan?: string | null;
  status: "ok" | "error";
  error?: string;
}) {
  const safe = {
    requestId: payload.requestId,
    operation: payload.operation,
    userId: payload.userId,
    productId: payload.productId,
    category: payload.category,
    productType: payload.productType,
    subscriptionId: payload.subscriptionId,
    plan: payload.plan || payload.subscription,
    subscriptionStatus: payload.subscriptionStatus,
    entitlements: payload.entitlements,
    productCount: payload.productCount,
    status: payload.status,
    error: payload.error ? String(payload.error).slice(0, 300) : undefined,
  };
  if (payload.status === "error") {
    console.error("[product]", safe);
  } else {
    console.info("[product]", safe);
  }
}
