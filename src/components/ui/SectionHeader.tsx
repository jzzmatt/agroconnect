import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  badgeText?: string;
  badgeVariant?: "default" | "secondary" | "pillarExpert" | "pillarAcademy" | "pillarShopping" | "pillarLocation";
  title: string;
  subtitle?: string;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SectionHeader({
  badgeText,
  badgeVariant = "secondary",
  title,
  subtitle,
  align = "left",
  className,
}: SectionHeaderProps) {
  const alignClass = {
    left: "text-left items-start",
    center: "text-center items-center mx-auto",
    right: "text-right items-end ml-auto",
  }[align];

  return (
    <div className={cn("flex flex-col max-w-3xl mb-8 space-y-2", alignClass, className)}>
      {badgeText && (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/50 uppercase tracking-wider">
          {badgeText}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-emerald-950">
        {title}
      </h2>
      {subtitle && (
        <p className="text-base sm:text-lg text-emerald-800/80 leading-relaxed max-w-2xl">
          {subtitle}
        </p>
      )}
    </div>
  );
}
