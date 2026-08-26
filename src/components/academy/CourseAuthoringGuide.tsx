"use client";

import React from "react";
import { Button } from "@/components/ui/Button";
import type {
  AuthoringNextAction,
  AuthoringProgress,
  AuthoringStepId,
} from "@/lib/academy/authoring-progress";

const STEP_MARKERS: Record<AuthoringProgress["steps"][number]["state"], string> = {
  completed: "✓",
  current: "●",
  pending: "○",
};

export function CourseAuthoringGuide({
  progress,
  title,
  nextStepLabel,
  stepLabels,
  nextActionMessage,
  actionLabel,
  onAction,
}: {
  progress: AuthoringProgress;
  title: string;
  nextStepLabel: string;
  stepLabels: Record<AuthoringStepId, string>;
  nextActionMessage: string;
  actionLabel?: string | null;
  onAction?: (action: AuthoringNextAction) => void;
}) {
  const canAct = Boolean(actionLabel && onAction && progress.nextAction.kind !== "none");

  return (
    <section className="rounded-3xl border border-border bg-surface-card p-4 sm:p-5 space-y-4">
      <div>
        <h2 className="text-sm font-black">{title}</h2>
        <p className="mt-2 text-xs font-semibold text-primary">
          {nextStepLabel}: {nextActionMessage}
        </p>
      </div>
      <ol className="grid gap-1 sm:grid-cols-2">
        {progress.steps.map((step) => (
          <li
            key={step.id}
            className={
              step.state === "current"
                ? "text-sm font-bold text-foreground"
                : step.state === "completed"
                  ? "text-sm text-emerald-700 dark:text-emerald-400"
                  : "text-sm text-muted-foreground"
            }
          >
            <span className="mr-2 font-black" aria-hidden="true">
              {STEP_MARKERS[step.state]}
            </span>
            {stepLabels[step.id]}
          </li>
        ))}
      </ol>
      {canAct ? (
        <Button type="button" size="sm" onClick={() => onAction?.(progress.nextAction)}>
          {actionLabel}
        </Button>
      ) : null}
    </section>
  );
}
