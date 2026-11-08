import "server-only";

import { toFile } from "openai";
import { getOpenAIClient, isOpenAIConfigured } from "@/lib/openai/client";
import { AGROCONNECT_HERO_IMAGE_MODEL } from "@/lib/openai/image-generation";
import { assertProductThumbnailSource } from "@/lib/products/product-thumbnail-source";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export async function generateProductThumbnail(params: {
  bytes: Buffer;
  mimeType: string;
  productTitle: string;
}): Promise<Buffer> {
  if (!isOpenAIConfigured()) fail("OPENAI_NOT_CONFIGURED");
  const mime = assertProductThumbnailSource(params.mimeType, params.bytes.length);
  const extension = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const title = params.productTitle.replace(/\s+/g, " ").trim().slice(0, 80) || "produto agrícola";
  try {
    const client = getOpenAIClient();
    const response = await client.images.edit({
      model: AGROCONNECT_HERO_IMAGE_MODEL,
      image: await toFile(new Uint8Array(params.bytes), `frame.${extension}`, { type: mime }),
      prompt: `Create a clear square product photograph for an Angolan agricultural marketplace listing named "${title}". Keep the subject from the supplied video frame. No text, watermark, logo, or collage.`,
      size: "1024x1024",
      quality: "medium",
      output_format: "jpeg",
      n: 1,
    });
    const encoded = response.data?.[0]?.b64_json;
    if (!encoded) fail("THUMBNAIL_GENERATION_FAILED");
    const image = Buffer.from(encoded, "base64");
    if (image.length <= 0) fail("THUMBNAIL_GENERATION_FAILED");
    return image;
  } catch (error) {
    if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) throw error;
    fail("THUMBNAIL_GENERATION_FAILED");
  }
}
