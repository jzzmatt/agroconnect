"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { classifyPublicVisit } from "@/lib/analytics/public-visit";

const STORAGE_KEY = "agroconnect_visitor";

function visitorId(): string | null {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return null;
  }
}

/** Anonymous public-page counter. Failures are ignored. */
export function PublicVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const id = visitorId();
    if (!id || !classifyPublicVisit({ pathname, visitorId: id, userAgent: navigator.userAgent })) return;
    const controller = new AbortController();
    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pathname, visitorId: id }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => undefined);
    return () => controller.abort();
  }, [pathname]);

  return null;
}
