"use client";

import { cn } from "@/components/ui/utils";
import type { ButtonHTMLAttributes } from "react";
import { FaRegStopCircle } from "react-icons/fa";

export type StopButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
>;

export const StopButton: React.FC<StopButtonProps> = ({
  className,
  ...props
}) => {
  return (
    <button
      type="button"
      className={cn(
        "size-8 rounded-full transition-all duration-200",
        "hover:scale-105 active:scale-95",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "flex items-center justify-center",
        "bg-transparent hover:bg-white/10",
        "dark:hover:bg-gray-100/10",
        className
      )}
      aria-label="Stop"
      title="Stop"
      {...props}
    >
      <FaRegStopCircle className="size-5 text-foreground" />
    </button>
  );
};
