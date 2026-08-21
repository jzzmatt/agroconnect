import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({
  message = "A carregar...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 space-y-3 text-emerald-800",
        className
      )}
    >
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
