/** Resolve user-scoped AgriProfile paths for navigation and redirects. */
export function agriprofilePath(
  clerkUserId: string,
  segment = ""
): string {
  const base = `/${clerkUserId}/agriprofile`;
  if (!segment) return base;
  return `${base}/${segment.replace(/^\//, "")}`;
}

/** Map legacy dashboard hrefs to AgriProfile workspace paths. */
export function resolveAgriprofileNavHref(
  href: string,
  clerkUserId?: string | null
): string {
  if (!clerkUserId) return href;

  const replacements: Record<string, string> = {
    "/dashboard": agriprofilePath(clerkUserId),
    "/dashboard/products": agriprofilePath(clerkUserId, "products"),
    "/dashboard/products/new": agriprofilePath(clerkUserId, "products/new"),
  };

  return replacements[href] ?? href;
}
