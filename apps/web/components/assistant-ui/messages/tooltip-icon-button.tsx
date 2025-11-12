"use client";

import type { ComponentPropsWithoutRef } from "react";
import { forwardRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/components/ui/utils";
import type { TooltipProps } from "@radix-ui/react-tooltip";

export type TooltipIconButtonProps = ComponentPropsWithoutRef<typeof Button> &
  TooltipProps & {
    tooltip: string;
    side?: "top" | "bottom" | "left" | "right";
  };

export const TooltipIconButton = forwardRef<
  HTMLButtonElement,
  TooltipIconButtonProps
>((props, ref) => {
  const {
    children,
    className,
    tooltip,
    side = "bottom",
    delayDuration,
    open,
    defaultOpen,
    onOpenChange,
    disableHoverableContent,
    ...rest
  } = props;
  return (
    <Tooltip
      delayDuration={delayDuration}
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      disableHoverableContent={disableHoverableContent}
    >
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          {...rest}
          className={cn("size-6 p-1", className)}
          ref={ref}
        >
          {children}
          <span className="sr-only">{tooltip}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side={side}>{tooltip}</TooltipContent>
    </Tooltip>
  );
});

TooltipIconButton.displayName = "TooltipIconButton";
