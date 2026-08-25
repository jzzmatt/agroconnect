"use client";

import { useUser } from "@clerk/nextjs";
import { agriprofilePath } from "@/lib/agriprofile/paths";

/**
 * Base path for seller product management inside the AgriProfile workspace.
 * Falls back to legacy dashboard routes when Clerk has not hydrated yet.
 */
export function useAgriprofileBase(): string {
  const { user } = useUser();
  if (user?.id) {
    return agriprofilePath(user.id);
  }
  return "/dashboard";
}

export function useProductsWorkspaceBase(): string {
  const base = useAgriprofileBase();
  return base === "/dashboard" ? "/dashboard/products" : `${base}/products`;
}
