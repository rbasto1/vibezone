import { PlusIcon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useChatActions } from "@/hooks/use-chat-actions";
import { usePanelsStateSetter, useUIStateSetter } from "@/hooks/use-panels";
import { useRuntimes } from "@/hooks/use-response-registration";
import { trpc } from "@/lib/trpc/client";
import { currentChatAtom, newChatAtom } from "@/store/chat";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { CustomThreadListItem } from "./custom-thread-list-item";

export const ThreadList: FC = () => {
  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <ThreadListNew />
      <ThreadListItems />
    </div>
  );
};

const ThreadListNew: FC = () => {
  const getRuntimes = useRuntimes();
  const setPanelsState = usePanelsStateSetter();
  const setUIState = useUIStateSetter();
  const [, createNewChat] = useAtom(newChatAtom);

  const handleNewThread = () => {
    // Generate new chat ID
    createNewChat();

    if (!getRuntimes) return;
    const runtimes = getRuntimes();
    for (const runtime of runtimes.values()) {
      runtime.thread.reset();
    }

    setPanelsState({});
    setUIState({ suggestionsUsed: false });
  };

  return (
    <Button
      className="data-active:bg-muted hover:bg-muted justify-start"
      variant="ghost"
      onClick={handleNewThread}
    >
      <PlusIcon />
      New Chat
    </Button>
  );
};

const ThreadListItems: FC = () => {
  const currentChat = useAtomValue(currentChatAtom);
  const setCurrentChat = useSetAtom(currentChatAtom);
  const { loadChatById } = useChatActions();
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);

  const { data: chats, isLoading } = trpc.messages.listChats.useQuery();
  const utils = trpc.useUtils();
  const archiveChatMutation = trpc.messages.archiveChat.useMutation({
    onSuccess: () => {
      // Refetch the chat list after archiving
      utils.messages.listChats.invalidate();
    },
  });

  const handleSelectChat = async (chatId: string) => {
    if (loadingChatId) return; // Prevent multiple simultaneous loads

    setLoadingChatId(chatId);

    try {
      // Update the current chat atom first
      setCurrentChat({
        id: chatId,
        createdAt: new Date(), // This will be updated when we load the actual chat
      });

      // Load the chat data imperatively
      const result = await loadChatById(chatId);
      if (!result.success) {
        console.error(`Failed to load chat ${chatId}:`, result.error);
      }
    } finally {
      setLoadingChatId(null);
    }
  };

  const handleArchiveChat = (chatId: string) => {
    archiveChatMutation.mutate({ chatId });
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground p-2">Loading chats...</div>
    );
  }

  if (!chats || chats.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-2">No chats yet</div>
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
        />
      ))}
    </div>
  );
};
