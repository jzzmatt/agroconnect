"use client";

import { useSearchParams } from "next/navigation";
import { resolveAuthRedirectUrl } from "@/lib/auth/redirect-url";

export function useAuthRedirectUrl(defaultUrl = "/dashboard"): string {
  const searchParams = useSearchParams();
  return resolveAuthRedirectUrl(searchParams.get("redirect_url"), defaultUrl);
}
