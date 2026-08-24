"use server";

import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { ProductVideoService } from "@/lib/services/product-video-service";
import { validateProductVideo } from "@/lib/products/video-validation";
import { PRODUCT_ERROR_CODES, createRequestId, logProductOperation } from "@/lib/products/errors";
import { isUuid, normalizeVideoUploadMeta } from "@/lib/products/ids";
import {
  AuthorizationError,
  requireProductOwnership,
  subjectFromProfile,
} from "@/lib/authorization/server";

export async function createProductVideoUploadAction(params: {
  productId: string;
  title: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  durationSeconds: number;
}) {
  const requestId = createRequestId();
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return { success: false, code: PRODUCT_ERROR_CODES.AUTH_REQUIRED, requestId };
    }

    const entitlements = getUserEntitlements({
      subscriptionPlan: profile.subscription_plan,
      roles: profile.roles,
    });
    if (!entitlements.can_upload_product_video || !entitlements.can_access_agriproduct) {
      logProductOperation({
        requestId,
        operation: "product_video_upload",
        userId: profile.clerk_user_id,
        productId: params.productId,
        subscription: profile.subscription_plan,
        status: "error",
        error: "forbidden",
      });
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_FORBIDDEN, requestId };
    }

    if (!isUuid(params.productId) || !isUuid(profile.id)) {
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_PUBLISH_FAILED, requestId };
    }

    // The upload entitlement does not grant access to another seller's product.
    try {
      await requireProductOwnership(params.productId, subjectFromProfile(profile));
    } catch (ownershipError) {
      if (ownershipError instanceof AuthorizationError) {
        logProductOperation({
          requestId,
          operation: "product_video_upload",
          userId: profile.clerk_user_id,
          productId: params.productId,
          subscription: profile.subscription_plan,
          status: "error",
          error: ownershipError.code,
        });
        return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_FORBIDDEN, requestId };
      }
      throw ownershipError;
    }

    const meta = normalizeVideoUploadMeta({
      mimeType: params.mimeType,
      fileName: params.filename,
    });
    const validation = validateProductVideo({
      mimeType: meta.mimeType,
      fileSize: params.fileSize,
      durationSeconds: params.durationSeconds,
      fileName: meta.fileName,
    });
    if (!validation.ok) {
      return { success: false, code: validation.code, message: validation.error, requestId };
    }

    const created = await ProductVideoService.createUpload({
      ownerId: profile.id,
      productId: params.productId,
      title: params.title,
      filename: meta.fileName,
      mimeType: meta.mimeType,
      fileSize: params.fileSize,
      durationSeconds: params.durationSeconds,
    });

    logProductOperation({
      requestId,
      operation: "product_video_upload",
      userId: profile.clerk_user_id,
      productId: params.productId,
      subscription: profile.subscription_plan,
      status: "ok",
    });

    return { success: true, requestId, video: created.video, upload: created.upload };
  } catch (err: any) {
    const code = err?.code || PRODUCT_ERROR_CODES.PRODUCT_VIDEO_INVALID;
    logProductOperation({
      requestId,
      operation: "product_video_upload",
      productId: params.productId,
      status: "error",
      error: err?.message,
    });
    return {
      success: false,
      code,
      message: err?.message,
      requestId,
    };
  }
}

export async function confirmProductVideoUploadAction(params: {
  videoId: string;
  productId: string;
  fileId: string;
  url: string;
  thumbnailUrl?: string | null;
  fileSize?: number;
}) {
  const requestId = createRequestId();
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { success: false, code: PRODUCT_ERROR_CODES.AUTH_REQUIRED, requestId };
  }

  try {
    await requireProductOwnership(params.productId, subjectFromProfile(profile));
  } catch (ownershipError) {
    if (ownershipError instanceof AuthorizationError) {
      return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_FORBIDDEN, requestId };
    }
    throw ownershipError;
  }

  const video = await ProductVideoService.confirmUpload({
    videoId: params.videoId,
    ownerId: profile.id,
    externalId: params.fileId,
    url: params.url,
    thumbnailUrl: params.thumbnailUrl,
    fileSize: params.fileSize,
  });

  if (!video) {
    return { success: false, code: PRODUCT_ERROR_CODES.IMAGEKIT_UPLOAD_FAILED, requestId };
  }

  return { success: true, requestId, video };
}

export async function deleteProductVideoAction(videoId: string) {
  await requireAuth();
  const profile = await getCurrentUserProfile();
  if (!profile) return { success: false, code: PRODUCT_ERROR_CODES.AUTH_REQUIRED };
  const entitlements = getUserEntitlements({ subscriptionPlan: profile.subscription_plan });
  if (!entitlements.can_upload_product_video) {
    return { success: false, code: PRODUCT_ERROR_CODES.PRODUCT_VIDEO_FORBIDDEN };
  }
  return { success: await ProductVideoService.markDeleted(videoId, profile.id) };
}
