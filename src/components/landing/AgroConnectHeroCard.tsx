"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface AgroConnectHeroCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  className?: string;
  floatDuration?: number;
  floatDelay?: number;
  entranceDelay?: number;
}

export function AgroConnectHeroCard({
  title,
  description,
  href,
  icon,
  className,
  floatDuration = 6,
  floatDelay = 0,
  entranceDelay = 0,
}: AgroConnectHeroCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: entranceDelay, ease: "easeOut" }}
      className={cn("relative z-20 w-full min-w-0", className)}
    >
      <motion.div
        animate={
          shouldReduceMotion
            ? undefined
            : {
                y: [0, -4, 0],
              }
        }
        transition={
          shouldReduceMotion
            ? undefined
            : {
                duration: floatDuration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: floatDelay,
              }
        }
      >
        <motion.div
          whileHover={
            shouldReduceMotion
              ? undefined
              : {
                  y: -4,
                  scale: 1.02,
                }
          }
          whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        >
        <Link
          href={href}
          className={cn(
            "group block rounded-2xl border border-border/70 bg-surface/75 p-3.5 shadow-md backdrop-blur-md",
            "transition-[border-color,background-color,box-shadow] duration-300",
            "hover:border-primary/40 hover:bg-surface/90 hover:shadow-lg hover:shadow-primary/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
            "dark:bg-surface/55 dark:hover:bg-surface/70"
          )}
        >
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary shadow-2xs">
            {icon}
          </div>
          <p className="text-xs font-black tracking-tight text-foreground">{title}</p>
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground line-clamp-2">{description}</p>
        </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
