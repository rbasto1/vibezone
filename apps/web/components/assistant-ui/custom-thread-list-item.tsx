import { RenameChatModal } from "@/components/assistant-ui/rename-chat-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import {
  ArchiveIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
} from "lucide-react";
import { useState, type FC } from "react";

interface CustomThreadListItemProps {
  chatId: string;
  title: string;
  lastMessageAt: Date;
  isActive?: boolean;
  isLoading?: boolean;
  onSelect: (chatId: string) => Promise<void>;
  onArchive: (chatId: string) => Promise<unknown>;
  onRename: (chatId: string, newTitle: string) => Promise<unknown>;
}

export const CustomThreadListItem: FC<CustomThreadListItemProps> = ({
  chatId,
  title,
  lastMessageAt,
  isActive = false,
  isLoading = false,
  onSelect,
  onArchive,
  onRename,
}) => {
  const [isArchiving, setIsArchiving] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);

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

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowRenameModal(true);
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MoreVerticalIcon size={16} className="mr-2 cursor-pointer" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleRename}>
            <PencilIcon className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleArchive} disabled={isArchiving}>
            {isArchiving ? (
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ArchiveIcon className="mr-2 h-4 w-4" />
            )}
            Archive
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showRenameModal && (
        <RenameChatModal
          chatId={chatId}
          currentTitle={title}
          onRename={onRename}
          onClose={() => setShowRenameModal(false)}
        />
      )}
    </div>
  );
};
