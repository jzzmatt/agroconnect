export const SIGN_OUT_REDIRECT = "/";

/**
 * Clears authenticated client representation only.
 * Clerk session cookies are terminated by Clerk signOut — this is not a local-only logout.
 */
export function clearAuthenticatedClientState() {
  if (typeof window === "undefined") return;

  const localKeys = [
    "agroconnect_active_profile_type",
    "agroconnect_user_profile_override",
    "agroconnect_selected_plan",
    "agroconnect_plan",
  ];
  const sessionKeys = [
    "agroconnect_prompted_profile_selector",
    "agroconnect_optimistic_plan",
  ];

  try {
    for (const key of localKeys) localStorage.removeItem(key);
    for (const key of sessionKeys) sessionStorage.removeItem(key);
  } catch {
    // private mode / quota
  }
}
