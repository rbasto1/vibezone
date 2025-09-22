"use client";

import React, { forwardRef } from "react";

import { cn } from "@/components/ui/utils";

type ChipProps = React.HTMLAttributes<HTMLDivElement>;

const Chip = forwardRef<HTMLDivElement, ChipProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-slot="chip"
        className={cn(
          "inline-flex h-9 max-w-full items-center gap-2 overflow-hidden rounded-full border border-border/60 bg-muted/60 px-2 pr-1 text-sm text-foreground shadow-xs",
          className
        )}
        {...props}
      />
    );
  }
);

Chip.displayName = "Chip";

type ChipLeadingProps = React.HTMLAttributes<HTMLSpanElement>;

const ChipLeading = forwardRef<HTMLSpanElement, ChipLeadingProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        data-slot="chip-leading"
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg bg-background/80 text-muted-foreground shadow-xs",
          className
        )}
        {...props}
      />
    );
  }
);

ChipLeading.displayName = "ChipLeading";

type ChipLabelProps = React.HTMLAttributes<HTMLSpanElement>;

const ChipLabel = forwardRef<HTMLSpanElement, ChipLabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        data-slot="chip-label"
        className={cn(
          "min-w-0 truncate text-xs font-medium text-foreground",
          className
        )}
        {...props}
      />
    );
  }
);

ChipLabel.displayName = "ChipLabel";

type ChipTrailingProps = React.HTMLAttributes<HTMLSpanElement>;

const ChipTrailing = forwardRef<HTMLSpanElement, ChipTrailingProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        data-slot="chip-trailing"
        className={cn("flex shrink-0 items-center gap-1", className)}
        {...props}
      />
    );
  }
);

ChipTrailing.displayName = "ChipTrailing";

type ChipDismissButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const ChipDismissButton = forwardRef<HTMLButtonElement, ChipDismissButtonProps>(
  ({ className, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-slot="chip-dismiss"
        type={type}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer",
          className
        )}
        {...props}
      />
    );
  }
);

ChipDismissButton.displayName = "ChipDismissButton";

export { Chip, ChipDismissButton, ChipLabel, ChipLeading, ChipTrailing };
