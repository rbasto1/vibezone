"use client";

import { PlusIcon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCurrentChat, useNewChat } from "@/hooks/use-chat";
import type { UseChatActionsResult } from "@/hooks/use-chat-actions";
import { useChatActions } from "@/hooks/use-chat-actions";
import {
  usePanelsConfigSetter,
  usePanelsStateSetter,
} from "@/hooks/use-panels";
import { useRuntimes } from "@/hooks/use-response-registration";
import { useSession } from "@/hooks/use-session";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { generateThreadId } from "@/lib/id";
import { trpc } from "@/lib/trpc/client";
import type { PanelConfig } from "@/store/panels";
import { CustomThreadListItem } from "./custom-thread-list-item";
import { useTranslations } from "next-intl";

export const ThreadList: FC = () => {
  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <ThreadListNew />
      <ThreadListItems />
    </div>
  );
};

const ThreadListNew: FC = () => {
  const t = useTranslations("ThreadList");
  const getRuntimes = useRuntimes();
  const setPanelsState = usePanelsStateSetter();
  const setPanelsConfig = usePanelsConfigSetter();
  const setUIState = useUIStateSetter();
  const createNewChat = useNewChat();

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
            initialMessages: [],
          }) satisfies PanelConfig
      )
    );
    setUIState({ suggestionsUsed: false });
  };

  return (
    <Button
      className="data-active:bg-muted hover:bg-muted justify-start"
      variant="ghost"
      onClick={handleNewChat}
    >
      <PlusIcon />
      {t("newChat")}
    </Button>
  );
};

const ThreadListItems: FC = () => {
  const t = useTranslations("ThreadList");
  const [currentChat, setCurrentChat] = useCurrentChat();
  const { loadChatById } = useChatActions();
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const setUIState = useUIStateSetter();

  const session = useSession();
  const { data: chats, error } = trpc.chats.listChats.useQuery(undefined, {
    enabled: !!session?.user,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });
  const utils = trpc.useUtils();
  const archiveChatMutation = trpc.chats.archiveChat.useMutation({
    onSuccess: () => {
      // Optimistically update the chat list
      utils.chats.listChats.setData(undefined, (prev) => {
        return (
          prev?.filter((c) => c.id !== archiveChatMutation.variables?.chatId) ??
          []
        );
      });
      // Refetch the chat list after archiving
      utils.chats.listChats.invalidate();
    },
  });

  const renameChatMutation = trpc.chats.renameChat.useMutation({
    onSuccess: (value) => {
      utils.chats.listChats.setData(undefined, (prev) => {
        if (!value.success || !prev) return prev;

        return prev.map((c) =>
          c.id === renameChatMutation.variables?.chatId
            ? { ...c, title: value.title }
            : c
        );
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

  if (!session?.user) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        {t("loginRequired")}
      </div>
    );
  }

  if (error) {
    return <div className="text-sm p-2 text-destructive">{error.message}</div>;
  }

  if (!chats) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        {t("loading")}
      </div>
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
    </div>
  );
};
