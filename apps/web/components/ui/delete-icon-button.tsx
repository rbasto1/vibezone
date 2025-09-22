import { cn } from "@/components/ui/utils";
import { Trash2 } from "lucide-react";

interface DeleteIconButtonProps {
  isDeleted: boolean;
  onDelete: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  title?: string;
  disabled?: boolean;
}

export function DeleteIconButton({
  isDeleted,
  onDelete,
  className,
  size = "md",
  title,
  disabled = false,
}: DeleteIconButtonProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDelete();
      }}
      className={cn(
        "transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        className
      )}
      title={title || (isDeleted ? "Restore" : "Delete")}
      disabled={disabled}
    >
      <Trash2
        className={cn(
          sizeClasses[size],
          isDeleted ? "text-emerald-600" : "text-red-600"
        )}
      />
    </button>
  );
}
