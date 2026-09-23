import { NextResponse } from "next/server";
import { getCurrentUserProfile, requireAuth } from "@/lib/clerk/auth";
import { generateAndSaveAgroConnectHeroImage } from "@/lib/openai/image-generation";
import { isOpenAIConfigured } from "@/lib/openai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only, on-demand hero regeneration. The landing page serves the saved
 * asset from /public — this route is not called on ordinary page views.
 */
export async function POST() {
  try {
    await requireAuth();
    const profile = await getCurrentUserProfile();
    if (!profile || profile.account_type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isOpenAIConfigured()) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
    }

    const result = await generateAndSaveAgroConnectHeroImage();
    return NextResponse.json({
      ok: true,
      publicPath: result.publicPath,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      model: result.model,
      format: result.format,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hero generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
