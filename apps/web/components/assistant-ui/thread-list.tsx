import { PlusIcon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useCurrentChat, useNewChat } from "@/hooks/use-chat";
import { useChatActions } from "@/hooks/use-chat-actions";
import { usePanelsStateSetter } from "@/hooks/use-panels";
import { useRuntimes } from "@/hooks/use-response-registration";
import { useSession } from "@/hooks/use-session";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { trpc } from "@/lib/trpc/client";
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
  const createNewChat = useNewChat();

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
  const [currentChat, setCurrentChat] = useCurrentChat();
  const { loadChatById } = useChatActions();
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);

  const session = useSession();
  const { data: chats, error } = trpc.chats.listChats.useQuery(undefined, {
    enabled: !!session?.user,
    placeholderData: (prev) => prev,
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

  const handleSelectChat = async (chatId: string) => {
    if (loadingChatId) return; // Prevent multiple simultaneous loads

    setLoadingChatId(chatId);

    try {
      // Update the current chat atom first
      setCurrentChat({
        id: chatId,
        createdAt: new Date(), // This will be updated when we load the actual chat
        fetchedTitle: true,
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

  const handleArchiveChat = async (chatId: string) =>
    archiveChatMutation.mutateAsync({ chatId });

  if (!session?.user) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        Please sign up or log in to save and load your chats
      </div>
    );
  }

  if (error) {
    return <div className="text-sm p-2 text-destructive">{error.message}</div>;
  }

  if (!chats) {
    return (
      <div className="text-sm text-muted-foreground p-2">Loading chats...</div>
    );
  }

  if (!chats.length) {
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
