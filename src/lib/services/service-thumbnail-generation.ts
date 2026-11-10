import "server-only";

import { getOpenAIClient, isOpenAIConfigured } from "@/lib/openai/client";
import { AGROCONNECT_HERO_IMAGE_MODEL } from "@/lib/openai/image-generation";
import { assertGeneratedThumbnail, serviceThumbnailPrompt, type ServiceThumbnailSource } from "@/lib/services/service-thumbnail";

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export async function generateServiceThumbnailImage(source: ServiceThumbnailSource): Promise<Buffer> {
  if (!isOpenAIConfigured()) fail("OPENAI_NOT_CONFIGURED");
  try {
    const client = getOpenAIClient();
    const response = await client.images.generate({
      model: AGROCONNECT_HERO_IMAGE_MODEL,
      prompt: serviceThumbnailPrompt(source),
      size: "1024x1024",
      quality: "medium",
      output_format: "jpeg",
      n: 1,
    });
    const encoded = response.data?.[0]?.b64_json;
    if (!encoded) fail("THUMBNAIL_GENERATION_FAILED");
    return assertGeneratedThumbnail(Buffer.from(encoded, "base64"));
  } catch (error) {
    if (error instanceof Error && "code" in error && typeof (error as { code?: unknown }).code === "string") throw error;
    if (error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)) throw error;
    fail("THUMBNAIL_GENERATION_FAILED");
  }
}
