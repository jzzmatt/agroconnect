import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-2xs",
        secondary:
          "border-border-subtle bg-secondary text-secondary-foreground",
        outline:
          "border-border text-foreground bg-surface",
        destructive:
          "border-red-300 dark:border-red-900 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200",
        success:
          "border-emerald-300 dark:border-emerald-900 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200",
        warning:
          "border-amber-300 dark:border-amber-900 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200",
        pillarExpert:
          "border-emerald-300 dark:border-emerald-800 bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-bold",
        pillarAcademy:
          "border-blue-300 dark:border-blue-800 bg-blue-100/80 dark:bg-blue-950/70 text-blue-900 dark:text-blue-200 font-bold",
        pillarShopping:
          "border-amber-300 dark:border-amber-800 bg-amber-100/80 dark:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-bold",
        pillarLocation:
          "border-teal-300 dark:border-teal-800 bg-teal-100/80 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
