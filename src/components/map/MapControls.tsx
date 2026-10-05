"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  className?: string;
}

export function MapControls({ onZoomIn, onZoomOut, onReset, className }: MapControlsProps) {
  const btn =
    "min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-white text-slate-700 border border-slate-200 shadow-md hover:bg-slate-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button type="button" className={btn} onClick={onZoomIn} aria-label="Aumentar zoom">
        <Plus className="w-5 h-5" />
      </button>
      <button type="button" className={btn} onClick={onZoomOut} aria-label="Diminuir zoom">
        <Minus className="w-5 h-5" />
      </button>
      <button type="button" className={btn} onClick={onReset} aria-label="Vista nacional de Angola">
        <RotateCcw className="w-5 h-5" />
      </button>
    </div>
  );
}
