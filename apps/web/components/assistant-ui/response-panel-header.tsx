import { cn } from "@/components/ui/utils";
import { XIcon } from "lucide-react";

export interface PanelHeaderProps {
  title: string;
  canClose: boolean;
  onClose: () => void;
}

import type { FC } from "react";

export const PanelHeader: FC<PanelHeaderProps> = ({
  title,
  canClose,
  onClose,
}) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
      <div className="font-medium truncate">{title}</div>
      <button
        className={cn(
          "p-1 rounded hover:bg-muted",
          canClose ? "opacity-100" : "opacity-40 cursor-not-allowed"
        )}
        onClick={() => canClose && onClose()}
        aria-label="Close panel"
        title={canClose ? "Close panel" : "At least one panel must remain"}
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
