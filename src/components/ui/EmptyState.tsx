import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-3xl border border-dashed border-border bg-surface max-w-lg mx-auto",
        className
      )}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      )}
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {actionLabel && (
        <Button onClick={onAction} variant="primary" size="sm" className="mt-4 font-bold">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
