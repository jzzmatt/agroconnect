"use client";

import React from "react";
import type { ReadinessChecklist, ReadinessItemId } from "@/lib/academy/course-readiness";

export function CourseReadinessChecklist({
  checklist,
  title,
  labels,
}: {
  checklist: ReadinessChecklist;
  title: string;
  labels: Record<ReadinessItemId, string>;
}) {
  return (
    <section className="rounded-3xl border border-border bg-surface-card p-4 space-y-2">
      <h2 className="text-xs font-black">{title}</h2>
      <ul className="space-y-1">
        {checklist.items.map((item) => (
          <li key={item.id} className="text-xs font-semibold">
            <span className={item.complete ? "text-emerald-600" : "text-muted-foreground"}>
              {item.complete ? "✓" : "○"} {labels[item.id]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
