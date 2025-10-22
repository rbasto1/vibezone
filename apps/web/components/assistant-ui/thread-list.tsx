"use client";

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";

import {
  ChevronDownIcon,
  FolderIcon,
  FolderPlusIcon,
  MessageCirclePlusIcon,
  MoreVerticalIcon,
  SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { CSSProperties, FC } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ProjectDeleteModal,
  type DeleteProjectOptions,
} from "@/components/assistant-ui/project-delete-modal";
import { ProjectModal } from "@/components/assistant-ui/project-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import { useCurrentChat, useCurrentChatSetter } from "@/hooks/use-chat";
import type { UseChatActionsResult } from "@/hooks/use-chat-actions";
import { useChatActions } from "@/hooks/use-chat-actions";
import { useNewChatHandler } from "@/hooks/use-new-chat-handler";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUser } from "@/lib/auth-client";
import { trpc, type RouterOutputs } from "@/lib/trpc/client";
import type { ProjectConfig } from "@/store/projects";
import { CustomThreadListItem } from "./custom-thread-list-item";

type ChatListItem = RouterOutputs["chats"]["listChats"]["chats"][number];

type ProjectModalState = {
  mode: "create" | "edit";
  project?: ProjectConfig;
};

const PROJECT_DROPPABLE_PREFIX = "project-";

const buildProjectDroppableId = (projectId: string) =>
  `${PROJECT_DROPPABLE_PREFIX}${projectId}`;

const getProjectIdFromDroppable = (id: string | null | undefined) => {
  if (!id) return null;
  return id.startsWith(PROJECT_DROPPABLE_PREFIX)
    ? id.slice(PROJECT_DROPPABLE_PREFIX.length)
    : id;
};

const emptyProjects: ProjectConfig[] = [];

export const ThreadList: FC = () => {
  const t = useTranslations("ThreadList");
  const user = useUser();
  const utils = trpc.useUtils();
  const setCurrentChat = useCurrentChatSetter();
  const createChat = useNewChatHandler();

  const [projectModalState, setProjectModalState] =
    useState<ProjectModalState | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectConfig | null>(
    null
  );

  const { data } = trpc.projects.list.useQuery(undefined, {
    enabled: !!user,
  });
  const projects = data ?? emptyProjects;

  const createProjectMutation = trpc.projects.create.useMutation();
  const updateProjectMutation = trpc.projects.update.useMutation();
  const deleteProjectMutation = trpc.projects.delete.useMutation();
  const moveChatMutation = trpc.projects.moveChat.useMutation();

  const refreshProjectsAndChats = useCallback(() => {
    void utils.projects.list.invalidate();
    void utils.chats.listChats.invalidate();
  }, [utils.projects.list, utils.chats.listChats]);

  const handleCreateProjectSubmit = useCallback(
    async (values: {
      name: string;
      color: string;
      instructions: string | null;
    }) => {
      const project = await createProjectMutation.mutateAsync(values);
      setProjectModalState(null);
      refreshProjectsAndChats();
      toast.success(t("toasts.projectCreated", { name: project.name }));
    },
    [createProjectMutation, refreshProjectsAndChats, t]
  );

  const handleUpdateProjectSubmit = useCallback(
    async (
      project: ProjectConfig,
      values: { name: string; color: string; instructions: string | null }
    ) => {
      const updated = await updateProjectMutation.mutateAsync({
        projectId: project.id,
        ...values,
      });
      setProjectModalState(null);
      refreshProjectsAndChats();
      toast.success(t("toasts.projectUpdated", { name: updated.name }));
    },
    [refreshProjectsAndChats, t, updateProjectMutation]
  );

  const handleDeleteProjectConfirm = useCallback(
    async (project: ProjectConfig, options: DeleteProjectOptions) => {
      await deleteProjectMutation.mutateAsync({
        projectId: project.id,
        strategy: options.strategy,
        targetProjectId: options.targetProjectId,
      });

      if (options.strategy === "move" && options.targetProjectId) {
        setCurrentChat((chat) =>
          chat.projectId === project.id
            ? { ...chat, projectId: options.targetProjectId ?? chat.projectId }
            : chat
        );
      } else if (options.strategy === "delete") {
        const fallback =
          projects.find(
            (candidate) => candidate.isDefault && candidate.id !== project.id
          )?.id ??
          projects.find((candidate) => candidate.id !== project.id)?.id ??
          null;
        setCurrentChat((chat) =>
          chat.projectId === project.id
            ? { ...chat, projectId: fallback }
            : chat
        );
      }

      refreshProjectsAndChats();
      toast.success(t("toasts.projectDeleted", { name: project.name }));
      setProjectToDelete(null);
    },
    [
      deleteProjectMutation,
      projects,
      refreshProjectsAndChats,
      setCurrentChat,
      t,
    ]
  );

  const handleMoveChat = useCallback(
    async (chatId: string, targetProjectId: string) => {
      await moveChatMutation.mutateAsync({
        chatId,
        targetProjectId,
      });
      setCurrentChat((chat) =>
        chat.id === chatId ? { ...chat, projectId: targetProjectId } : chat
      );
      refreshProjectsAndChats();
    },
    [moveChatMutation, refreshProjectsAndChats, setCurrentChat]
  );

  const handleCreateChat = useCallback(
    (project: ProjectConfig) => {
      const chat = createChat({
        projectId: project.id,
        projectInstructions: project.instructions ?? null,
      });
      if (!chat) {
        toast.error(t("errors.createChat"));
      }
    },
    [createChat, t]
  );

  const defaultProject = useMemo(
    () => projects.find((project) => project.isDefault) ?? projects[0] ?? null,
    [projects]
  );

  const moveChatPendingChatId =
    moveChatMutation.isPending && moveChatMutation.variables
      ? (moveChatMutation.variables.chatId ?? null)
      : null;
  const moveChatPendingProjectId =
    moveChatMutation.isPending && moveChatMutation.variables
      ? (moveChatMutation.variables.targetProjectId ?? null)
      : null;

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <ThreadListSearch />
      <ThreadListNew
        projects={projects}
        defaultProject={defaultProject}
        onCreateProject={() => setProjectModalState({ mode: "create" })}
        onNewChat={handleCreateChat}
      />
      <ThreadListItems
        projects={projects}
        onCreateProject={() => setProjectModalState({ mode: "create" })}
        onEditProject={(project) =>
          setProjectModalState({ mode: "edit", project })
        }
        onDeleteProject={setProjectToDelete}
        onMoveChat={handleMoveChat}
        moveChatPendingChatId={moveChatPendingChatId}
        moveChatPendingProjectId={moveChatPendingProjectId}
      />

      {projectModalState && (
        <ProjectModal
          mode={projectModalState.mode}
          project={projectModalState.project}
          isSubmitting={
            projectModalState.mode === "create"
              ? createProjectMutation.isPending
              : updateProjectMutation.isPending
          }
          onSubmit={(values) =>
            projectModalState.mode === "create"
              ? handleCreateProjectSubmit(values)
              : projectModalState.project
                ? handleUpdateProjectSubmit(projectModalState.project, values)
                : Promise.reject(new Error("Project not found"))
          }
          onClose={() => {
            if (
              (projectModalState.mode === "create" &&
                createProjectMutation.isPending) ||
              (projectModalState.mode === "edit" &&
                updateProjectMutation.isPending)
            ) {
              return;
            }
            setProjectModalState(null);
          }}
        />
      )}

      {projectToDelete && (
        <ProjectDeleteModal
          project={projectToDelete}
          projects={projects}
          isSubmitting={deleteProjectMutation.isPending}
          onConfirm={(options) =>
            handleDeleteProjectConfirm(projectToDelete, options)
          }
          onClose={() => {
            if (!deleteProjectMutation.isPending) {
              setProjectToDelete(null);
            }
          }}
        />
      )}
    </div>
  );
};

const ThreadListSearch: FC = () => {
  const t = useTranslations("ThreadList");
  const setUIState = useUIStateSetter();

  const handleOpenSearch = () => {
    setUIState({ panelOpen: "search" });
  };

  return (
    <Button
      className="data-active:bg-muted hover:bg-muted justify-start"
      variant="ghost"
      onClick={handleOpenSearch}
    >
      <SearchIcon />
      {t("searchChats")}
    </Button>
  );
};

interface ThreadListNewProps {
  projects: ProjectConfig[];
  defaultProject: ProjectConfig | null;
  onCreateProject: () => void;
  onNewChat: (project: ProjectConfig) => void;
}

const ThreadListNew: FC<ThreadListNewProps> = ({
  projects,
  defaultProject,
  onCreateProject,
  onNewChat,
}) => {
  const t = useTranslations("ThreadList");

  if (!defaultProject) {
    return (
      <Button
        className="data-active:bg-muted hover:bg-muted justify-start"
        variant="ghost"
        disabled
      >
        <MessageCirclePlusIcon />
        {t("newChat")}
      </Button>
    );
  }

  if (projects.length <= 1) {
    return (
      <Button
        className="data-active:bg-muted hover:bg-muted justify-start"
        variant="ghost"
        onClick={() => defaultProject && onNewChat(defaultProject)}
        disabled={!defaultProject}
      >
        <MessageCirclePlusIcon />
        {t("newChat")}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="data-active:bg-muted hover:bg-muted justify-between"
          variant="ghost"
        >
          <span className="flex items-center gap-2">
            <MessageCirclePlusIcon />
            {t("newChat")}
          </span>
          <ChevronDownIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {projects.map((project) => (
          <DropdownMenuItem key={project.id} onClick={() => onNewChat(project)}>
            <span
              className="mr-2 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: project.color }}
              aria-hidden="true"
            />
            <span className="flex-1 truncate">{project.name}</span>
            {project.isDefault && (
              <span className="text-xs text-muted-foreground">
                {t("defaultProjectLabel")}
              </span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCreateProject}>
          <FolderPlusIcon className="mr-2 h-4 w-4" />
          {t("actions.createProject")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface ThreadListItemsProps {
  projects: ProjectConfig[];
  onCreateProject: () => void;
  onEditProject: (project: ProjectConfig) => void;
  onDeleteProject: (project: ProjectConfig) => void;
  onMoveChat: (chatId: string, targetProjectId: string) => Promise<void>;
  moveChatPendingChatId: string | null;
  moveChatPendingProjectId: string | null;
}

const ThreadListItems: FC<ThreadListItemsProps> = ({
  projects,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  onMoveChat,
  moveChatPendingChatId,
  moveChatPendingProjectId,
}) => {
  const t = useTranslations("ThreadList");
  const [currentChat, setCurrentChat] = useCurrentChat();
  const { loadChatById } = useChatActions();
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const setUIState = useUIStateSetter();

  const user = useUser();
  const listInput = useMemo(() => ({}), []);
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = trpc.chats.listChats.useInfiniteQuery(listInput, {
    enabled: !!user,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const chats = useMemo(
    () => data?.pages.flatMap((page) => page.chats) ?? [],
    [data]
  );

  const chatById = useMemo(() => {
    return new Map<string, ChatListItem>(chats.map((chat) => [chat.id, chat]));
  }, [chats]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user || isLoading) return;
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refetch]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: null, rootMargin: "200px", threshold: 0 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const utils = trpc.useUtils();
  const archiveChatMutation = trpc.chats.archiveChat.useMutation({
    onSuccess: (_data, variables) => {
      utils.chats.listChats.setInfiniteData(listInput, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            chats: page.chats.filter((c) => c.id !== variables.chatId),
          })),
        };
      });
      void utils.projects.list.invalidate();
      return utils.chats.listChats.invalidate();
    },
  });

  const renameChatMutation = trpc.chats.renameChat.useMutation({
    onSuccess: (value, variables) => {
      if (!value.success) return;

      utils.chats.listChats.setInfiniteData(listInput, (prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          pages: prev.pages.map((page) => ({
            ...page,
            chats: page.chats.map((c) =>
              c.id === variables.chatId ? { ...c, title: value.title } : c
            ),
          })),
        };
      });
      return utils.chats.listChats.invalidate();
    },
  });

  const chatsByProject = useMemo(() => {
    const map = new Map<string, ChatListItem[]>();
    for (const project of projects) {
      map.set(project.id, []);
    }
    for (const chat of chats) {
      const list = map.get(chat.project.id);
      if (list) {
        list.push(chat);
      } else {
        map.set(chat.project.id, [chat]);
      }
    }
    return map;
  }, [chats, projects]);

  const [collapsedProjects, setCollapsedProjects] = useState<
    Record<string, boolean>
  >({});

  const toggleProject = useCallback((projectId: string) => {
    setCollapsedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const chatId = String(active.id);
      const targetProjectId = getProjectIdFromDroppable(
        typeof over.id === "string" ? over.id : null
      );
      if (!targetProjectId) return;
      const chat = chatById.get(chatId);
      if (!chat || chat.project.id === targetProjectId) return;

      void onMoveChat(chatId, targetProjectId).catch((error) => {
        console.error("Failed to move chat:", error);
        toast.error(t("errors.moveChat"));
      });
    },
    [chatById, onMoveChat, t]
  );

  const handleSelectChat = useCallback(
    async (chat: ChatListItem): Promise<UseChatActionsResult | null> => {
      if (loadingChatId) return null;

      setLoadingChatId(chat.id);
      setUIState({ panelOpen: null });
      setCurrentChat({
        id: chat.id,
        createdAt: new Date(),
        addedToList: true,
        projectId: chat.project.id,
        fetchedTitlePanelId: "loaded-from-db",
      });

      try {
        const result = await loadChatById(chat.id);
        if (!result.success) {
          console.error(`Failed to load chat ${chat.id}:`, result.error);
        }

        setUIState({ suggestionsUsed: true });
        return result;
      } finally {
        setLoadingChatId(null);
      }
    },
    [loadChatById, loadingChatId, setCurrentChat, setUIState]
  );

  const handleArchiveChat = useCallback(
    (chatId: string) => archiveChatMutation.mutateAsync({ chatId }),
    [archiveChatMutation]
  );

  const handleRenameChat = useCallback(
    (chatId: string, newTitle: string) =>
      renameChatMutation.mutateAsync({ chatId, title: newTitle }),
    [renameChatMutation]
  );

  if (!user) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        {t("loginRequired")}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm p-2 text-destructive">{error.message}</div>;
  }

  if (isLoading && !data) {
    return (
      <div className="text-sm text-muted-foreground p-2">{t("loading")}</div>
    );
  }

  const hasProjects = projects.length > 0;

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex flex-col gap-2">
        {hasProjects ? (
          projects.map((project) => (
            <ProjectSection
              key={project.id}
              project={project}
              chats={chatsByProject.get(project.id) ?? []}
              collapsed={!!collapsedProjects[project.id]}
              onToggleCollapse={() => toggleProject(project.id)}
              onSelectChat={handleSelectChat}
              onArchiveChat={handleArchiveChat}
              onRenameChat={handleRenameChat}
              onMoveChat={onMoveChat}
              onCreateProject={onCreateProject}
              onEditProject={onEditProject}
              onDeleteProject={onDeleteProject}
              projects={projects}
              currentChatId={currentChat.id}
              loadingChatId={loadingChatId}
              moveChatPendingChatId={moveChatPendingChatId}
              moveChatPendingProjectId={moveChatPendingProjectId}
            />
          ))
        ) : (
          <div className="text-sm text-muted-foreground p-2">
            {t("noProjects")}
          </div>
        )}
        <div ref={sentinelRef} className="h-16" aria-hidden />
        {isFetchingNextPage && (
          <div className="text-sm text-muted-foreground p-2 panel-button-glow">
            {t("loading")}
          </div>
        )}
      </div>
    </DndContext>
  );
};

interface ProjectSectionProps {
  project: ProjectConfig;
  chats: ChatListItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectChat: (chat: ChatListItem) => Promise<UseChatActionsResult | null>;
  onArchiveChat: (chatId: string) => Promise<unknown>;
  onRenameChat: (chatId: string, title: string) => Promise<unknown>;
  onMoveChat: (chatId: string, targetProjectId: string) => Promise<void>;
  onCreateProject: () => void;
  onEditProject: (project: ProjectConfig) => void;
  onDeleteProject: (project: ProjectConfig) => void;
  projects: ProjectConfig[];
  currentChatId: string;
  loadingChatId: string | null;
  moveChatPendingChatId: string | null;
  moveChatPendingProjectId: string | null;
}

const ProjectSection: FC<ProjectSectionProps> = ({
  project,
  chats,
  collapsed,
  onToggleCollapse,
  onSelectChat,
  onArchiveChat,
  onRenameChat,
  onMoveChat,
  onCreateProject,
  onEditProject,
  onDeleteProject,
  projects,
  currentChatId,
  loadingChatId,
  moveChatPendingChatId,
  moveChatPendingProjectId,
}) => {
  const t = useTranslations("ThreadList");
  const { isOver, setNodeRef } = useDroppable({
    id: buildProjectDroppableId(project.id),
  });

  const headerClasses = cn(
    "flex items-center justify-between rounded-lg border border-transparent px-2 py-1 transition",
    isOver && "border-dashed border-ring bg-muted/60"
  );

  const projectChatsCount = chats.length;

  const handleDeleteProject = () => {
    if (!project.isDefault) {
      onDeleteProject(project);
    }
  };

  return (
    <div ref={setNodeRef} className="flex flex-col gap-2">
      <div className={headerClasses}>
        <button
          type="button"
          className="flex flex-1 items-center gap-3 rounded-md px-1 py-1 text-left transition hover:bg-muted"
          onClick={onToggleCollapse}
        >
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "-rotate-90"
            )}
          />
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: project.color }}
              aria-hidden="true"
            />
            {project.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("projectCount", { count: projectChatsCount })}
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVerticalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={() => onEditProject(project)}>
              <FolderIcon className="mr-2 h-4 w-4" />
              {t("projectMenu.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateProject}>
              <FolderPlusIcon className="mr-2 h-4 w-4" />
              {t("projectMenu.create")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDeleteProject}
              disabled={project.isDefault}
            >
              {project.isDefault ? (
                <span className="text-muted-foreground text-sm">
                  {t("projectMenu.deleteDisabled")}
                </span>
              ) : (
                <span className="text-sm text-destructive">
                  {t("projectMenu.delete")}
                </span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-1">
          {chats.length ? (
            chats.map((chat) => (
              <DraggableChatItem
                key={chat.id}
                chat={chat}
                isActive={currentChatId === chat.id}
                isLoading={loadingChatId === chat.id}
                onSelect={onSelectChat}
                onArchive={onArchiveChat}
                onRename={onRenameChat}
                projects={projects}
                onMove={onMoveChat}
                onCreateProject={onCreateProject}
                moveChatPendingChatId={moveChatPendingChatId}
                moveChatPendingProjectId={moveChatPendingProjectId}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-muted px-3 py-2 text-xs text-muted-foreground">
              {t("projectEmpty")}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface DraggableChatItemProps {
  chat: ChatListItem;
  isActive: boolean;
  isLoading: boolean;
  onSelect: (chat: ChatListItem) => Promise<UseChatActionsResult | null>;
  onArchive: (chatId: string) => Promise<unknown>;
  onRename: (chatId: string, title: string) => Promise<unknown>;
  projects: ProjectConfig[];
  onMove: (chatId: string, targetProjectId: string) => Promise<void>;
  onCreateProject: () => void;
  moveChatPendingChatId: string | null;
  moveChatPendingProjectId: string | null;
}

const DraggableChatItem: FC<DraggableChatItemProps> = ({
  chat,
  isActive,
  isLoading,
  onSelect,
  onArchive,
  onRename,
  projects,
  onMove,
  onCreateProject,
  moveChatPendingChatId,
  moveChatPendingProjectId,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: chat.id });

  const style: CSSProperties | undefined = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging ? "cursor-grabbing opacity-60" : "cursor-grab"
      )}
      {...listeners}
      {...attributes}
    >
      <CustomThreadListItem
        chatId={chat.id}
        projectId={chat.project.id}
        title={chat.title}
        lastMessageAt={chat.lastMessageAt}
        isActive={isActive}
        isLoading={isLoading}
        onSelect={() => onSelect(chat)}
        onArchive={onArchive}
        onRename={onRename}
        onMove={onMove}
        onCreateProject={onCreateProject}
        projects={projects}
        movePendingChatId={moveChatPendingChatId}
        movePendingProjectId={moveChatPendingProjectId}
      />
    </div>
  );
};
