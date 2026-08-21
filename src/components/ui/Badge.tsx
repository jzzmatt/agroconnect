import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-700 text-white shadow-xs",
        secondary:
          "border-transparent bg-emerald-100 text-emerald-800",
        outline:
          "border-emerald-300 text-emerald-800 bg-emerald-50/50",
        destructive:
          "border-transparent bg-red-100 text-red-800 border-red-200",
        success:
          "border-transparent bg-emerald-100 text-emerald-800",
        warning:
          "border-transparent bg-amber-100 text-amber-800",
        pillarExpert:
          "border-emerald-200 bg-emerald-50 text-emerald-800 font-bold",
        pillarAcademy:
          "border-blue-200 bg-blue-50 text-blue-800 font-bold",
        pillarShopping:
          "border-amber-200 bg-amber-50 text-amber-800 font-bold",
        pillarLocation:
          "border-teal-200 bg-teal-50 text-teal-800 font-bold",
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
