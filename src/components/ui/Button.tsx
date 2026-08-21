import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm active:bg-emerald-900",
        primary:
          "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm active:bg-emerald-900",
        secondary:
          "bg-emerald-100/70 text-emerald-900 hover:bg-emerald-100 border border-emerald-200/60",
        outline:
          "border border-emerald-300 bg-transparent text-emerald-900 hover:bg-emerald-50 active:bg-emerald-100",
        ghost:
          "text-emerald-900 hover:bg-emerald-50 hover:text-emerald-950",
        link:
          "text-emerald-700 underline-offset-4 hover:underline p-0 h-auto font-medium",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        subtle:
          "bg-white text-emerald-950 border border-emerald-100 hover:border-emerald-200 shadow-xs",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-10 w-10",
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
