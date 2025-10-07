"use client";

import { generateId } from "ai";
import { PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCurrentChat, useNewChat } from "@/hooks/use-chat";
import type { UseChatActionsResult } from "@/hooks/use-chat-actions";
import { useChatActions } from "@/hooks/use-chat-actions";
import {
  usePanelsConfigSetter,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useRuntimes } from "@/hooks/use-response-registration";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import { useUser } from "@/lib/auth-client";
import { generateThreadId } from "@/lib/id";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import { CustomThreadListItem } from "./custom-thread-list-item";

export const ThreadList: FC = () => {
  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <ThreadListSearch />
      <ThreadListNew />
      <ThreadListItems />
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

const ThreadListNew: FC = () => {
  const t = useTranslations();
  const getRuntimes = useRuntimes();
  const setPanelsState = usePanelsStateSetter();
  const setPanelsConfig = usePanelsConfigSetter();
  const setUIState = useUIStateSetter();
  const createNewChat = useNewChat();
  const preferences = useUserPreferencesValue();

  const systemPrompt = preferences.changedPrompt
    ? preferences.systemPrompt
    : t("Prompts.system");

  const handleNewChat = () => {
    // Generate new chat ID
    createNewChat();

    if (!getRuntimes) return;
    const runtimes = getRuntimes();
    for (const runtime of runtimes.values()) {
      runtime.thread.reset();
    }

    setPanelsState({});
    setPanelsConfig((config) =>
      config.map(
        (c, order) =>
          ({
            id: generateThreadId(order),
            provider: c.provider,
            model: c.model,
            initialMessages: systemPrompt
              ? [
                  {
                    id: generateId(),
                    role: "system",
                    parts: [
                      {
                        type: "text",
                        text: systemPrompt,
                      },
                    ],
                  },
                ]
              : [],
          }) satisfies PanelConfig
      )
    );
    setUIState({ panelOpen: null, suggestionsUsed: false });
  };

  return (
    <Button
      className="data-active:bg-muted hover:bg-muted justify-start"
      variant="ghost"
      onClick={handleNewChat}
    >
      <PlusIcon />
      {t("ThreadList.newChat")}
    </Button>
  );
};

const ThreadListItems: FC = () => {
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
  const sentinelRef = useRef<HTMLDivElement | null>(null);

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
      utils.chats.listChats.invalidate();
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
      utils.chats.listChats.invalidate();
    },
  });

  const handleSelectChat = async (
    chatId: string
  ): Promise<UseChatActionsResult | null> => {
    if (loadingChatId) return null; // Prevent multiple simultaneous loads

    setLoadingChatId(chatId);

    try {
      // Update the current chat atom first
      setCurrentChat({
        id: chatId,
        createdAt: new Date(), // This will be updated when we load the actual chat
        addedToList: true,
        fetchedTitlePanelId: "loaded-from-db",
      });

      // Load the chat data imperatively
      const result = await loadChatById(chatId);
      if (!result.success) {
        console.error(`Failed to load chat ${chatId}:`, result.error);
      }

      setUIState({ suggestionsUsed: true });

      return result;
    } finally {
      setLoadingChatId(null);
    }
  };

  const handleArchiveChat = (chatId: string) =>
    archiveChatMutation.mutateAsync({ chatId });

  const handleRenameChat = (chatId: string, newTitle: string) =>
    renameChatMutation.mutateAsync({ chatId, title: newTitle });

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

  if (!chats.length) {
    return (
      <div className="text-sm text-muted-foreground p-2">{t("empty")}</div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {chats.map((chat) => (
        <CustomThreadListItem
          key={chat.id}
          chatId={chat.id}
          title={chat.title}
          lastMessageAt={chat.lastMessageAt}
          isActive={currentChat.id === chat.id}
          isLoading={loadingChatId === chat.id}
          onSelect={handleSelectChat}
          onArchive={handleArchiveChat}
          onRename={handleRenameChat}
        />
      ))}
      {!isFetchingNextPage ? (
        <div ref={sentinelRef} className="h-20" aria-hidden />
      ) : (
        <div className="text-sm text-muted-foreground p-2 panel-button-glow">
          {t("loading")}
        </div>
      )}
    </div>
  );
};
