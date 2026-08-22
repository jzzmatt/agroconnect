"use client";

import { useCallback, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { clearAuthenticatedClientState, SIGN_OUT_REDIRECT } from "@/lib/auth/clear-client-state";

const SIGN_OUT_TIMEOUT_MS = 5000;
const PUBLIC_LANDING = SIGN_OUT_REDIRECT;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("sign_out_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Single sign-out handler for header, sidebar, mobile menu, and settings.
 * 1. Clerk signOut()
 * 2. Clear authenticated client state
 * 3. Hard-navigate to the public landing page so protected routes cannot linger
 */
export function useSignOut() {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);

  const handleSignOut = useCallback(async () => {
    if (pending) return;
    setPending(true);
    clearAuthenticatedClientState();

    try {
      await withTimeout(signOut({ redirectUrl: PUBLIC_LANDING }), SIGN_OUT_TIMEOUT_MS);
    } catch (error) {
      console.warn("[signOut] Clerk signOut did not complete in time:", error);
    } finally {
      if (typeof window !== "undefined") {
        window.location.assign(PUBLIC_LANDING);
      }
    }
  }, [pending, signOut]);

  return { handleSignOut, pending };
}

export { SIGN_OUT_REDIRECT };
