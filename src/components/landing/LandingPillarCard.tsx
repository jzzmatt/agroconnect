"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type PillarAccent = "emerald" | "blue" | "amber" | "teal";

const accentStyles: Record<
  PillarAccent,
  { iconWrap: string; icon: string; link: string; hoverBorder: string; hoverShadow: string }
> = {
  emerald: {
    iconWrap: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300",
    icon: "text-emerald-600",
    link: "text-primary",
    hoverBorder: "hover:border-emerald-500/45 dark:hover:border-emerald-400/35",
    hoverShadow: "hover:shadow-emerald-500/10",
  },
  blue: {
    iconWrap: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300",
    icon: "text-blue-600",
    link: "text-blue-600",
    hoverBorder: "hover:border-blue-500/45 dark:hover:border-blue-400/35",
    hoverShadow: "hover:shadow-blue-500/10",
  },
  amber: {
    iconWrap: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300",
    icon: "text-amber-600",
    link: "text-amber-600",
    hoverBorder: "hover:border-amber-500/45 dark:hover:border-amber-400/35",
    hoverShadow: "hover:shadow-amber-500/10",
  },
  teal: {
    iconWrap: "bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300",
    icon: "text-teal-600",
    link: "text-teal-600",
    hoverBorder: "hover:border-teal-500/45 dark:hover:border-teal-400/35",
    hoverShadow: "hover:shadow-teal-500/10",
  },
};

export interface LandingPillarCardProps {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  accent: PillarAccent;
  icon: React.ReactNode;
}

export function LandingPillarCard({
  title,
  description,
  href,
  linkLabel,
  accent,
  icon,
}: LandingPillarCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const styles = accentStyles[accent];

  return (
    <motion.div
      className={cn(
        "group/pillar w-full max-w-sm mx-auto md:max-w-none",
        "rounded-3xl border border-border bg-surface-card p-6 shadow-xs",
        "transition-[box-shadow,border-color,background-color] duration-300 ease-out",
        styles.hoverBorder,
        styles.hoverShadow,
        "hover:bg-surface-elevated/80 hover:shadow-lg"
      )}
      whileHover={
        shouldReduceMotion
          ? undefined
          : {
              y: -6,
              scale: 1.02,
            }
      }
      whileTap={shouldReduceMotion ? undefined : { scale: 0.995 }}
      transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.85 }}
    >
      <Link
        href={href}
        className={cn(
          "flex h-full flex-col space-y-3 text-center md:text-left",
          "rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        <motion.div
          className={cn(
            "mx-auto flex h-10 w-10 items-center justify-center rounded-2xl font-bold md:mx-0",
            styles.iconWrap
          )}
          whileHover={shouldReduceMotion ? undefined : { scale: 1.08, rotate: -2 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
        >
          <span className={cn("inline-flex", styles.icon)}>{icon}</span>
        </motion.div>

        <h3 className="font-bold text-base text-foreground transition-colors group-hover/pillar:text-foreground">
          {title}
        </h3>

        <p className="flex-1 text-xs leading-relaxed text-muted-foreground">{description}</p>

        <span
          className={cn(
            "inline-flex items-center gap-1 pt-1 text-xs font-bold transition-transform duration-300",
            "group-hover/pillar:translate-x-0.5",
            styles.link
          )}
        >
          <span>{linkLabel}</span>
          <span aria-hidden>→</span>
        </span>
      </Link>
    </motion.div>
  );
}
