"use client";

import { useEffect } from "react";

/**
 * Broadcast when the stored profile changes, so views holding profile state can
 * refetch instead of showing a value the database no longer agrees with.
 *
 * Mirrors SUBSCRIPTION_CHANGED_EVENT. The dashboard layout persists across
 * client-side navigation, so saving on /profile/edit does not remount it and it
 * would otherwise keep serving the profile it fetched on first load.
 */
export const PROFILE_CHANGED_EVENT = "agroconnect:profile-changed";

export function notifyProfileChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
}

/**
 * Re-run `onChange` when the profile changes, when the tab regains focus, and
 * when it becomes visible again. `onChange` should be a stable callback.
 */
export function useProfileChangeListener(onChange: () => void): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => onChange();
    window.addEventListener(PROFILE_CHANGED_EVENT, handler);
    window.addEventListener("focus", handler);
    // visibilitychange fires on document, not window.
    document.addEventListener("visibilitychange", handler);

    return () => {
      window.removeEventListener(PROFILE_CHANGED_EVENT, handler);
      window.removeEventListener("focus", handler);
      document.removeEventListener("visibilitychange", handler);
    };
  }, [onChange]);
}
