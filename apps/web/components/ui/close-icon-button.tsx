import { XIcon } from "lucide-react";
import type { ButtonProps } from "./button";
import { cn } from "./utils";

interface CloseIconButtonProps extends ButtonProps {
  buttonClassName?: string;
}

export const CloseIconButton = ({
  onClick,
  className,
  buttonClassName,
  ...props
}: CloseIconButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      {...props}
      className={cn(
        "rounded-full p-1 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
        buttonClassName
      )}
      aria-label="Close"
    >
      <XIcon className={cn("h-4 w-4", className)} />
    </button>
  );
};
