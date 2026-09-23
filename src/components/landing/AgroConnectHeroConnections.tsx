"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

interface AgroConnectHeroConnectionsProps {
  className?: string;
  simplified?: boolean;
}

export function AgroConnectHeroConnections({
  className,
  simplified = false,
}: AgroConnectHeroConnectionsProps) {
  const shouldReduceMotion = useReducedMotion();

  const paths = simplified
    ? [
        "M 50 72 L 50 58",
        "M 28 50 L 42 50",
        "M 58 50 L 72 50",
      ]
    : [
        "M 50 78 L 50 62",
        "M 22 48 L 38 50",
        "M 78 46 L 62 50",
        "M 50 62 L 50 50",
        "M 38 50 L 50 50 L 62 50",
      ];

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn("pointer-events-none absolute inset-0 h-full w-full text-primary/25 dark:text-primary/35", className)}
    >
      {paths.map((d, index) => (
        <g key={d}>
          <motion.path
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={0.35}
            strokeLinecap="round"
            initial={{ pathLength: shouldReduceMotion ? 1 : 0, opacity: shouldReduceMotion ? 0.35 : 0 }}
            animate={{ pathLength: 1, opacity: 0.35 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { duration: 1.4, delay: 0.8 + index * 0.15, ease: "easeInOut" }
            }
          />
          {!shouldReduceMotion && !simplified ? (
            <motion.circle
              r={0.45}
              fill="currentColor"
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 0.7, 0],
                offsetDistance: ["0%", "100%"],
              }}
              style={{
                offsetPath: `path('${d}')`,
              }}
              transition={{
                duration: 4.5,
                repeat: Infinity,
                delay: 1.2 + index * 0.4,
                ease: "linear",
              }}
            />
          ) : null}
        </g>
      ))}
      <circle cx="50" cy="50" r="1.2" className="fill-primary/40" />
    </svg>
  );
}
