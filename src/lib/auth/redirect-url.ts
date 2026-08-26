/** Returns a safe in-app redirect path from a query param, or the default. */
export function resolveAuthRedirectUrl(
  redirectParam: string | null | undefined,
  defaultUrl = "/dashboard"
): string {
  if (!redirectParam) return defaultUrl;
  if (!redirectParam.startsWith("/")) return defaultUrl;
  if (redirectParam.startsWith("//")) return defaultUrl;
  return redirectParam;
}
