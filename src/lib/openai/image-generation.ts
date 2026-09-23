import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { AGROCONNECT_HERO_IMAGE_PROMPT } from "./agroconnect-hero-prompt";
import { getOpenAIClient } from "./client";
import {
  AGROCONNECT_HERO_IMAGE_HEIGHT,
  AGROCONNECT_HERO_IMAGE_PATH,
  AGROCONNECT_HERO_IMAGE_WIDTH,
} from "@/lib/landing/agroconnect-hero-asset";

export const AGROCONNECT_HERO_IMAGE_MODEL = "gpt-image-2" as const;

export type AgroConnectHeroImageGenerationResult = {
  publicPath: typeof AGROCONNECT_HERO_IMAGE_PATH;
  absolutePath: string;
  bytes: number;
  width: number;
  height: number;
  model: typeof AGROCONNECT_HERO_IMAGE_MODEL;
  format: "webp";
};

export async function generateAgroConnectHeroImageBuffer(): Promise<Buffer> {
  const client = getOpenAIClient();

  const response = await client.images.generate({
    model: AGROCONNECT_HERO_IMAGE_MODEL,
    prompt: AGROCONNECT_HERO_IMAGE_PROMPT,
    size: `${AGROCONNECT_HERO_IMAGE_WIDTH}x${AGROCONNECT_HERO_IMAGE_HEIGHT}`,
    quality: "high",
    output_format: "webp",
    output_compression: 85,
    n: 1,
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error("OpenAI image generation returned no image data.");
  }

  return Buffer.from(b64, "base64");
}

export async function generateAndSaveAgroConnectHeroImage(): Promise<AgroConnectHeroImageGenerationResult> {
  const buffer = await generateAgroConnectHeroImageBuffer();
  const outDir = path.join(process.cwd(), "public", "images");
  mkdirSync(outDir, { recursive: true });

  const absolutePath = path.join(outDir, "agroconnect-hero.webp");
  writeFileSync(absolutePath, buffer);

  return {
    publicPath: AGROCONNECT_HERO_IMAGE_PATH,
    absolutePath,
    bytes: buffer.length,
    width: AGROCONNECT_HERO_IMAGE_WIDTH,
    height: AGROCONNECT_HERO_IMAGE_HEIGHT,
    model: AGROCONNECT_HERO_IMAGE_MODEL,
    format: "webp",
  };
}
