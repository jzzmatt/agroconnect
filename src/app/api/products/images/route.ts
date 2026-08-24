import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { ProductMediaService, validateProductImage } from "@/lib/services/product-media-service";
import { isUuid } from "@/lib/products/ids";
import {
  AuthorizationError,
  requireProductOwnership,
  subjectFromProfile,
} from "@/lib/authorization/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile || !isUuid(profile.id)) {
      return NextResponse.json({ success: false, error: "AUTH_REQUIRED", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    const entitlements = getUserEntitlements({ subscriptionPlan: profile.subscription_plan });
    if (!entitlements.can_upload_product_images) {
      return NextResponse.json({ success: false, error: "FEATURE_NOT_AVAILABLE", code: "FEATURE_NOT_AVAILABLE" }, { status: 403 });
    }

    const form = await request.formData();
    const productId = String(form.get("productId") || "");
    const file = form.get("file");
    const isPrimary = String(form.get("isPrimary") || "") === "true";
    const altText = String(form.get("altText") || "Produto agrícola — AgriConnect");

    if (!isUuid(productId) || !(file instanceof File)) {
      return NextResponse.json({ success: false, error: "PRODUCT_IMAGE_FAILED", code: "PRODUCT_IMAGE_FAILED" }, { status: 400 });
    }

    // Holding the upload entitlement does not grant access to another seller's
    // product. The write below uses the service-role client, which bypasses RLS,
    // so ownership must be proven here.
    try {
      await requireProductOwnership(productId, subjectFromProfile(profile));
    } catch (ownershipError) {
      if (ownershipError instanceof AuthorizationError) {
        return NextResponse.json(
          { success: false, error: ownershipError.code, code: ownershipError.code },
          { status: ownershipError.code === "AUTH_REQUIRED" ? 401 : 403 }
        );
      }
      throw ownershipError;
    }

    const mimeType = file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
    const validation = validateProductImage({
      mimeType,
      fileSize: file.size,
      fileName: file.name,
    });
    if (!validation.ok) {
      return NextResponse.json({ success: false, error: "PRODUCT_IMAGE_FAILED", code: "PRODUCT_IMAGE_FAILED", message: validation.error }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    let image;
    try {
      image = await ProductMediaService.add({
        productId,
        ownerId: profile.id,
        buffer: bytes,
        fileName: file.name || "product-image.jpg",
        mimeType,
        fileSize: file.size,
        altText,
        isPrimary,
      });
    } catch (uploadError: unknown) {
      const message = uploadError instanceof Error ? uploadError.message : "PRODUCT_IMAGE_FAILED";
      const code = (uploadError as { code?: string })?.code || "PRODUCT_IMAGE_FAILED";
      console.warn("[product image] upload:", message);
      return NextResponse.json({ success: false, error: code, code, message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      image,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PRODUCT_IMAGE_FAILED";
    if (/autorizado|unauthor|sign in/i.test(message)) {
      return NextResponse.json({ success: false, error: "AUTH_REQUIRED", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "PRODUCT_IMAGE_FAILED", code: "PRODUCT_IMAGE_FAILED", message }, { status: 500 });
  }
}
