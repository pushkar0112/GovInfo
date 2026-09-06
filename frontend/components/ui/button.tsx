import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "gov" | "ghost" | "default" | "destructive";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      default:
        "bg-blue-900 text-white hover:bg-blue-950 shadow-sm focus-visible:ring-blue-800",
      primary:
        "bg-blue-900 text-white hover:bg-blue-950 shadow-sm focus-visible:ring-blue-800",
      secondary:
        "bg-amber-600 text-white hover:bg-amber-700 shadow-sm focus-visible:ring-amber-500",
      outline:
        "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
      gov:
        "bg-[#0B2545] text-white hover:bg-[#133A6B] border border-[#0B2545] shadow-sm focus-visible:ring-blue-900",
      ghost:
        "text-slate-700 hover:bg-slate-100 hover:text-slate-900",
      destructive:
        "bg-rose-600 text-white hover:bg-rose-700 shadow-sm focus-visible:ring-rose-500",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-md",
      md: "h-10 px-4 py-2 text-sm rounded-md",
      lg: "h-12 px-6 text-base rounded-md font-medium",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
