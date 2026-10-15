"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/provider";

export function OfflineNotice() {
  const { dict } = useI18n();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => {
      setOffline(navigator.onLine === false);
    };
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="border-b border-primary-hover bg-primary px-4 py-3 text-center text-primary-foreground"
    >
      <p className="text-sm font-bold">{dict.pwa.offlineTitle}</p>
      <p className="mx-auto mt-1 max-w-3xl text-xs leading-relaxed">{dict.pwa.offlineBody}</p>
    </div>
  );
}
