import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface CheckListItemProps {
  children: React.ReactNode;
  className?: string;
  iconClassName?: string;
}

export function CheckListItem({
  children,
  className,
  iconClassName,
}: CheckListItemProps) {
  return (
    <li className={cn("flex items-start gap-3 text-sm sm:text-base text-foreground", className)}>
      <div
        className={cn(
          "w-6 h-6 rounded-full bg-secondary border border-border-subtle text-secondary-foreground flex items-center justify-center shrink-0 mt-0.5 shadow-2xs",
          iconClassName
        )}
      >
        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
      </div>
      <span className="leading-relaxed font-semibold text-foreground">{children}</span>
    </li>
  );
}
