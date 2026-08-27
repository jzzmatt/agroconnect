"use client";

import { useI18n } from "@/i18n/provider";

export function AcademyLoadingFallback({ messageKey }: { messageKey?: "loading" }) {
  const { dict } = useI18n();
  return (
    <p className="text-sm text-muted-foreground text-center py-16">{dict.common[messageKey || "loading"]}</p>
  );
}
