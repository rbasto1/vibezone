"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

import { useSidebar } from "@/components/ui/sidebar/sidebar-context";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useOpenSignIn, useUser } from "@/lib/auth-client";
import { useAddAi } from "./use-add-ai";
import { useNewChatHandler } from "./use-new-chat-handler";
import { useStableValue } from "./use-stable-value";

const SHORTCUT_KEYS = {
  newChat: "o",
  search: "k",
  sidebar: "b",
  addAi: "m",
} as const;

const shouldHandleEvent = (event: KeyboardEvent) => {
  if (event.defaultPrevented) {
    return false;
  }
  return event.metaKey || event.ctrlKey;
};

export const useGlobalShortcuts = () => {
  const isMobile = useIsMobile();
  const createChat = useNewChatHandler();
  const setUIState = useUIStateSetter();
  const { toggleSidebar } = useSidebar();
  const user = useUser();
  const isLoggedIn = Boolean(user);
  const openSignIn = useOpenSignIn();
  const t = useTranslations("ThreadList");
  const { openAddAiSelector } = useAddAi();

  const controls = useStableValue({
    createChat,
    isLoggedIn,
    openAddAiSelector,
    openSignIn,
    toggleSidebar,
  });

  useEffect(() => {
    if (isMobile) return;

    const {
      createChat,
      isLoggedIn,
      openAddAiSelector,
      openSignIn,
      toggleSidebar,
    } = controls.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldHandleEvent(event)) return;

      const key = event.key.toLowerCase();

      if (key === SHORTCUT_KEYS.newChat && event.shiftKey) {
        event.preventDefault();
        const chat = createChat();
        if (!chat) {
          toast.error(t("errors.createChat"));
        }
        return;
      }

      if (key === SHORTCUT_KEYS.search) {
        event.preventDefault();
        if (isLoggedIn) {
          setUIState({ panelOpen: "search" });
        } else {
          openSignIn();
        }
        return;
      }

      if (key === SHORTCUT_KEYS.sidebar) {
        event.preventDefault();
        toggleSidebar();
        return;
      }

      if (key === SHORTCUT_KEYS.addAi) {
        event.preventDefault();
        openAddAiSelector({ showLimitToast: true });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controls, setUIState, isMobile, t]);
};
