import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "gov" | "warning" | "destructive";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default: "bg-slate-900 text-slate-50",
    secondary: "bg-slate-100 text-slate-900 border border-slate-200",
    outline: "border border-slate-300 text-slate-700",
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    gov: "bg-blue-900/10 text-blue-900 border border-blue-900/20 font-semibold",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    destructive: "bg-rose-50 text-rose-700 border border-rose-200",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
