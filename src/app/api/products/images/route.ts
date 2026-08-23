import { NextResponse } from "next/server";
import { requireAuth, getCurrentUserProfile } from "@/lib/clerk/auth";
import { getUserEntitlements } from "@/lib/services/pricing-service";
import { validateProductImage } from "@/lib/services/product-media-service";
import { isUuid } from "@/lib/products/ids";
import {
  AuthorizationError,
  requireProductOwnership,
  subjectFromProfile,
} from "@/lib/authorization/server";
import {
  createServerSupabaseClient,
  tryCreateAdminServerSupabaseClient,
} from "@/lib/supabase/server";

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

    const imageId = crypto.randomUUID();
    const storagePath = `products/${productId}/${imageId}.jpg`;
    const client = tryCreateAdminServerSupabaseClient() || (await createServerSupabaseClient());
    const bytes = Buffer.from(await file.arrayBuffer());

    let publicUrl = "";
    try {
      const uploaded = await client.storage.from("product-images").upload(storagePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });
      if (!uploaded.error) {
        publicUrl = client.storage.from("product-images").getPublicUrl(storagePath).data.publicUrl;
      } else {
        console.warn("[product image] storage:", uploaded.error.message);
      }
    } catch (storageError) {
      console.warn("[product image] storage:", storageError instanceof Error ? storageError.message : storageError);
    }

    if (!publicUrl) {
      if (bytes.length > 350_000) {
        return NextResponse.json({ success: false, error: "PRODUCT_IMAGE_FAILED", code: "PRODUCT_IMAGE_FAILED" }, { status: 500 });
      }
      publicUrl = `data:${mimeType};base64,${bytes.toString("base64")}`;
    }

    const { error } = await (client.from("product_images") as any).insert({
      id: imageId,
      product_id: productId,
      owner_id: profile.id,
      storage_provider: publicUrl.startsWith("data:") ? "local" : "supabase_storage",
      storage_path: storagePath,
      url: publicUrl,
      alt_text: altText,
      mime_type: mimeType,
      file_size: file.size,
      sort_order: 0,
      is_primary: isPrimary,
    });
    if (error) {
      console.warn("[product image] insert:", error.message);
      return NextResponse.json({ success: false, error: "PRODUCT_IMAGE_FAILED", code: "PRODUCT_IMAGE_FAILED", message: error.message }, { status: 500 });
    }

    if (isPrimary) {
      await (client.from("products") as any)
        .update({ primary_image_url: publicUrl.startsWith("data:") ? null : publicUrl })
        .eq("id", productId);
    }

    return NextResponse.json({
      success: true,
      image: { id: imageId, product_id: productId, url: publicUrl, is_primary: isPrimary },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "PRODUCT_IMAGE_FAILED";
    if (/autorizado|unauthor|sign in/i.test(message)) {
      return NextResponse.json({ success: false, error: "AUTH_REQUIRED", code: "AUTH_REQUIRED" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "PRODUCT_IMAGE_FAILED", code: "PRODUCT_IMAGE_FAILED", message }, { status: 500 });
  }
}
