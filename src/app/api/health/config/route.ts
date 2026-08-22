import { NextResponse } from "next/server";
import { isSupabaseConfigured, missingSupabaseEnvVars } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reports which required environment variables a running deployment can see.
 * Values are never returned — only whether each name is present — so this is
 * safe to open in a browser when diagnosing a deployment.
 */
export async function GET() {
  const present = (name: string) => Boolean(process.env[name]);

  const supabase = {
    configured: isSupabaseConfigured(),
    missing: missingSupabaseEnvVars(),
    NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: present("SUPABASE_SERVICE_ROLE_KEY"),
  };

  const clerk = {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: present("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
    CLERK_SECRET_KEY: present("CLERK_SECRET_KEY"),
    CLERK_WEBHOOK_SECRET: present("CLERK_WEBHOOK_SECRET"),
  };

  const bunny = {
    BUNNY_STREAM_API_KEY: present("BUNNY_STREAM_API_KEY"),
    BUNNY_STREAM_LIBRARY_ID: present("BUNNY_STREAM_LIBRARY_ID"),
    BUNNY_STREAM_CDN_HOSTNAME: present("BUNNY_STREAM_CDN_HOSTNAME"),
  };

  const canPublishProducts = supabase.configured && clerk.CLERK_SECRET_KEY;

  return NextResponse.json(
    {
      environment: process.env.NODE_ENV,
      canPublishProducts,
      canUploadProductVideo: bunny.BUNNY_STREAM_API_KEY && bunny.BUNNY_STREAM_LIBRARY_ID,
      supabase,
      clerk,
      bunny,
    },
    { status: canPublishProducts ? 200 : 503 }
  );
}
