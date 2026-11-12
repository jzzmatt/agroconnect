"use client";

import { useEffect, useState } from "react";
import { resolveDemoVisibility } from "./catalog";

/**
 * Subtle marker for a signed-in presenter. Public marketplace cards do not use it.
 */
export function DemoBadge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    resolveDemoVisibility()
      .then((visibility) => {
        if (!cancelled) setVisible(visibility.mode !== "none");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;
  return (
    <span className="mb-4 inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      Demo
    </span>
  );
}
