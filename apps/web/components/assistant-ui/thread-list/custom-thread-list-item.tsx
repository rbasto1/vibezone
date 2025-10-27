"use client";

import { RenameChatModal } from "@/components/assistant-ui/rename-chat-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import { useCurrentChatValue } from "@/hooks/use-chat";
import {
  useChatActions,
  type UseChatActionsResult,
} from "@/hooks/use-chat-actions";
import { useNewChatHandler } from "@/hooks/use-new-chat-handler";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import type { ProjectConfig } from "@/store/projects";
import {
  FolderIcon,
  FolderPlusIcon,
  Loader2Icon,
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FC } from "react";
import { toast } from "sonner";

interface CustomThreadListItemProps {
  chatId: string;
  projectId: string;
  title: string;
  lastMessageAt: Date;
  isActive?: boolean;
  isLoading?: boolean;
  movePendingChatId?: string | null;
  movePendingProjectId?: string | null;
  onSelect: () => Promise<UseChatActionsResult | null>;
  projects: ProjectConfig[];
}

export const CustomThreadListItem: FC<CustomThreadListItemProps> = ({
  chatId,
  projectId,
  title,
  lastMessageAt,
  isActive = false,
  isLoading = false,
  movePendingChatId,
  movePendingProjectId,
  onSelect,
  projects,
}) => {
  const t = useTranslations("ThreadListItem");
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [error, setError] = useState<string>();
  const setUiState = useUIStateSetter();
  const { deleteChat, moveChat } = useChatActions();
  const currentChat = useCurrentChatValue();
  const startNewChat = useNewChatHandler();

  const isMovePending = movePendingChatId === chatId;
  const activeMoveTarget = isMovePending ? movePendingProjectId : null;
  const otherProjects = projects.filter((project) => project.id !== projectId);
  const currentProject = projects.find((project) => project.id === projectId);

  const handleSelect = async () => {
    setError(undefined);
    setUiState({ panelOpen: null });
    if (isLoading) return;
    const result = await onSelect();
    if (result?.error) {
      setError(result.error);
    }
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsDeleting(true);
    if (currentChat?.id === chatId) {
      startNewChat({ projectId });
    }
    void deleteChat(chatId).finally(() => setIsDeleting(false));
  };

  const handleRename = (event: React.MouseEvent) => {
    event.stopPropagation();
    setShowRenameModal(true);
  };

  const handleMove = (event: React.MouseEvent, targetProjectId: string) => {
    event.stopPropagation();
    if (pendingProjectId || isMovePending) return;
    setPendingProjectId(targetProjectId);
    void moveChat(chatId, targetProjectId)
      .catch((moveError) => {
        console.error("Failed to move chat:", moveError);
        toast.error(t("moveError"));
      })
      .finally(() => {
        setPendingProjectId(null);
      });
  };

  const handleCreateProject = (event: React.MouseEvent) => {
    event.stopPropagation();
    setUiState({ createProject: true });
  };

  const moveBusy = Boolean(pendingProjectId) || isMovePending;

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
            {isLoading ? t("loading") : error ? error : title || t("untitled")}
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
          <Button variant="ghost" size="icon" className="mr-1 h-7 w-7">
            <MoreVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuItem onClick={handleRename}>
            <PencilIcon className="mr-2 h-4 w-4" />
            {t("rename")}
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderIcon className="mr-2 h-4 w-4" />
              {t("move")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem disabled>
                <span
                  className="mr-2 h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: currentProject?.color ?? "#9ca3af",
                  }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">
                  {currentProject?.name ?? t("currentProject")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("currentProjectBadge")}
                </span>
              </DropdownMenuItem>
              {otherProjects.length ? (
                otherProjects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    disabled={moveBusy}
                    onClick={(event) => handleMove(event, project.id)}
                  >
                    <span
                      className="mr-2 h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: project.color }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 truncate">{project.name}</span>
                    {pendingProjectId === project.id ||
                    activeMoveTarget === project.id ? (
                      <Loader2Icon className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : null}
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  {t("noOtherProjects")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCreateProject}>
                <FolderPlusIcon className="mr-2 h-4 w-4" />
                {t("createProject")}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TrashIcon className="mr-2 h-4 w-4" />
            )}
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showRenameModal && (
        <RenameChatModal
          chatId={chatId}
          projectId={projectId}
          currentTitle={title}
          onClose={() => setShowRenameModal(false)}
        />
      )}
    </div>
  );
};
