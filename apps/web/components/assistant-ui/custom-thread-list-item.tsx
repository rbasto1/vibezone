import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { ArchiveIcon } from "lucide-react";
import type { FC } from "react";

interface CustomThreadListItemProps {
  chatId: string;
  title: string;
  lastMessageAt: Date;
  isActive?: boolean;
  isLoading?: boolean;
  onSelect: (chatId: string) => Promise<void>;
  onArchive: (chatId: string) => void;
}

export const CustomThreadListItem: FC<CustomThreadListItemProps> = ({
  chatId,
  title,
  lastMessageAt,
  isActive = false,
  isLoading = false,
  onSelect,
  onArchive,
}) => {
  const handleSelect = async () => {
    if (isLoading) return;
    await onSelect(chatId);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive(chatId);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2",
        isActive
          ? "bg-muted ring-ring ring-2"
          : "hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring"
      )}
    >
      <Button
        variant="ghost"
        className="flex-grow px-3 py-2 text-start justify-start h-auto"
        onClick={handleSelect}
        disabled={isLoading}
      >
        <div className="flex flex-col items-start">
          <p className="text-sm font-medium">
            {isLoading ? "Loading..." : title || "New Chat"}
          </p>
          <p className="text-xs text-muted-foreground">
            {lastMessageAt.toLocaleDateString()}
          </p>
        </div>
      </Button>

      <TooltipIconButton
        className="hover:text-foreground/60 p-4 text-foreground ml-auto mr-1 size-4"
        variant="ghost"
        tooltip="Archive chat"
        onClick={handleArchive}
      >
        <ArchiveIcon />
      </TooltipIconButton>
    </div>
  );
};
