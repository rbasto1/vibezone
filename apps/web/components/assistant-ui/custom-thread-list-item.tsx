import { RenameChatModal } from "@/components/assistant-ui/rename-chat-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import type { UseChatActionsResult } from "@/hooks/use-chat-actions";
import {
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { useState, type FC } from "react";

interface CustomThreadListItemProps {
  chatId: string;
  title: string;
  lastMessageAt: Date;
  isActive?: boolean;
  isLoading?: boolean;
  onSelect: (chatId: string) => Promise<UseChatActionsResult | null>;
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
  const [error, setError] = useState<string>();

  const handleSelect = async () => {
    setError(undefined);
    if (isLoading) return;
    const result = await onSelect(chatId);
    if (result?.error) {
      setError(result.error);
    }
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
          : "hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring",
        isLoading && "matrix-loading",
        error && "border border-destructive ring-destructive ring-1"
      )}
    >
      <Button
        variant="ghost"
        className="flex-1 min-w-0 justify-start h-auto text-left"
        onClick={handleSelect}
        disabled={isLoading}
        title={error ? error : title}
      >
        <div className="flex flex-col items-start min-w-0 w-full">
          <p
            className={cn(
              "text-sm font-medium truncate w-full",
              error && "text-destructive"
            )}
          >
            {isLoading ? "Loading..." : error ? error : title || "New Chat"}
          </p>
          {!error && (
            <p className="text-xs text-muted-foreground">
              {lastMessageAt.toLocaleDateString()}
            </p>
          )}
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
              <TrashIcon className="mr-2 h-4 w-4" />
            )}
            Delete
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
