import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { ArchiveIcon, Loader2Icon } from "lucide-react";
import { useState, type FC } from "react";

interface CustomThreadListItemProps {
  chatId: string;
  title: string;
  lastMessageAt: Date;
  isActive?: boolean;
  isLoading?: boolean;
  onSelect: (chatId: string) => Promise<void>;
  onArchive: (chatId: string) => Promise<unknown>;
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
  const [isArchiving, setIsArchiving] = useState(false);

  const handleSelect = async () => {
    if (isLoading) return;
    await onSelect(chatId);
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsArchiving(true);
    await onArchive(chatId).finally(() => {
      setIsArchiving(false);
    });
  };

  return (
    <div
      className={cn(
        "mx-1 flex items-center gap-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2",
        isActive
          ? "bg-muted ring-ring ring-1"
          : "hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring"
      )}
    >
      <Button
        variant="ghost"
        className="flex-1 min-w-0 justify-start h-auto text-left"
        onClick={handleSelect}
        disabled={isLoading}
      >
        <div className="flex flex-col items-start min-w-0 w-full">
          <p className="text-sm font-medium truncate w-full">
            {isLoading ? "Loading..." : title || "New Chat"}
          </p>
          <p className="text-xs text-muted-foreground">
            {lastMessageAt.toLocaleDateString()}
          </p>
        </div>
      </Button>

      <TooltipIconButton
        className="hover:text-foreground/60 p-4 text-foreground flex-shrink-0 mr-1 size-4"
        variant="ghost"
        tooltip="Archive chat"
        onClick={handleArchive}
      >
        {isArchiving ? (
          <Loader2Icon className="animate-spin" />
        ) : (
          <ArchiveIcon />
        )}
      </TooltipIconButton>
    </div>
  );
};
