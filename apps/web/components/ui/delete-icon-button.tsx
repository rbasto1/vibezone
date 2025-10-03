import { EyeOffIcon, Trash2 } from "lucide-react";

import { cn } from "@/components/ui/utils";
import { Button } from "./button";

interface DeleteIconButtonProps {
  isDeleted: boolean;
  onDelete: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  title?: string;
  disabled?: boolean;
  isHide?: boolean;
}

export function DeleteIconButton({
  isDeleted,
  onDelete,
  className,
  size = "md",
  title,
  disabled = false,
  isHide = false,
}: DeleteIconButtonProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete();
      }}
      variant="outline"
      className={className}
      title={
        title ||
        (isHide
          ? isDeleted
            ? "Show"
            : "Hide"
          : isDeleted
            ? "Restore"
            : "Delete")
      }
      disabled={disabled}
    >
      {isHide ? (
        <EyeOffIcon
          className={cn(
            sizeClasses[size],
            isHide ? null : isDeleted ? "text-emerald-600" : "text-red-600"
          )}
        />
      ) : (
        <Trash2
          className={cn(
            sizeClasses[size],
            isHide ? null : isDeleted ? "text-emerald-600" : "text-red-600"
          )}
        />
      )}
    </Button>
  );
}
