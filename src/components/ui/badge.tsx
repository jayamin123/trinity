import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors [&>span.dot]:size-1.5 [&>span.dot]:rounded-full",
  {
    variants: {
      variant: {
        good: "bg-good-soft text-good [&>span.dot]:bg-good",
        bad: "bg-destructive-soft text-destructive [&>span.dot]:bg-destructive",
        warn: "bg-warn-soft text-warn [&>span.dot]:bg-warn",
        info: "bg-info-soft text-info [&>span.dot]:bg-info",
        brand: "bg-primary-soft text-primary-ink [&>span.dot]:bg-primary",
        neutral: "border border-border bg-secondary text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
