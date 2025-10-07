"use client";
import { ArrowUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC, MouseEvent } from "react";
import { useContext, useMemo, useRef } from "react";
import { toast } from "sonner";

import { GlobalComposerContext } from "@/components/providers/composer-provider";
import { Button } from "@/components/ui/button";
import { StopButton } from "@/components/ui/stop-button";
import {
  ANON_DAILY_LIMIT,
  useAnonQuotaSetter,
  useAnonRemaining,
} from "@/hooks/use-anon-quota";
import {
  useAttachmentsValue,
  useClearAttachments,
  useCompleteAttachmentsValue,
  useRemoveAttachment,
} from "@/hooks/use-attachments";
import { useCurrentChatSetter } from "@/hooks/use-chat";
import { usePanelsState } from "@/hooks/use-panels";
import { useStateSessionStorage } from "@/hooks/use-session-storage";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUser } from "@/lib/auth-client";
import { ReasoningSliderTrigger } from "../ui/reasoning-slider-trigger";
import { ComposerAddAttachment } from "./add-attachment";
import { AttachmentChip } from "./attachment-chip";

export const GlobalComposer: FC = () => {
  const t = useTranslations("GlobalComposer");
  const [prompt, setPrompt] = useStateSessionStorage("prompt");
  const removeAttachment = useRemoveAttachment();
  const attachments = useAttachmentsValue();
  const completeAttachments = useCompleteAttachmentsValue();
  const setCurrentChat = useCurrentChatSetter();
  const setUIState = useUIStateSetter();
  const remaining = useAnonRemaining();
  const clearAttachments = useClearAttachments();
  const [panelsState, setPanelsState] = usePanelsState();
  const setAnonUsage = useAnonQuotaSetter();
  const { user } = useUser();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const anyPanelRunning = useMemo(
    () => Object.values(panelsState).some((p) => p.running),
    [panelsState]
  );

  const ctx = useContext(GlobalComposerContext);
  if (!ctx) throw new Error("GlobalComposerContext is not available");

  const { getRuntimes } = ctx;

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't steal focus when clicking on actual buttons
    if (target.closest("button")) return;
    textareaRef.current?.focus();
  };

  const handleStopAll = () => {
    const failures: string[] = [];
    for (const runtime of getRuntimes().values()) {
      try {
        runtime.thread.cancelRun();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        failures.push(message);
      }
    }
    if (failures.length) {
      toast.error(
        t("stopAllError", {
          failures: failures.join("; "),
        })
      );
    }
  };

  const onStopAll = anyPanelRunning ? handleStopAll : null;

  const send = (text: string): boolean => {
    const msg = text.trim();
    if (!msg || !completeAttachments) return false;

    const runtimes = getRuntimes();
    const isLoggedIn = !!user;
    if (!isLoggedIn) {
      // Anonymous quota enforcement
      if (remaining !== null && remaining < runtimes.size) {
        toast.error(
          t("guestLimit", {
            limit: ANON_DAILY_LIMIT,
          })
        );
        return false;
      }
    }

    const runningPanels: string[] = [];
    for (const [panelId, runtime] of runtimes.entries()) {
      try {
        runtime.thread.append({
          runConfig: { custom: { thisIscustom: true } },
          metadata: { custom: { thisIsMyMetadata: true } },
          role: "user",
          content: [{ type: "text", text: msg }],
          attachments: completeAttachments,
        });
        runningPanels.push(panelId);
      } catch (e) {
        const message = e instanceof Error ? e.message : JSON.stringify(e);
        toast.error(
          t("sendFailed", {
            message,
          })
        );
      }
    }

    // Update panel states to running
    setPanelsState((prev) =>
      runningPanels.reduce(
        (acc, panelId) => {
          acc[panelId] = prev[panelId]
            ? {
                ...prev[panelId],
                running: true,
                error: undefined,
              }
            : {
                running: true,
                dirty: false,
                hasMessages: false,
              };
          return acc;
        },
        { ...prev }
      )
    );

    if (runningPanels.length) {
      if (!isLoggedIn) {
        // After successfully enqueuing messages, consume credits for guests
        setAnonUsage((prev) => ({
          date: prev.date,
          count: (prev.count ?? 0) + runningPanels.length,
        }));
      }

      clearAttachments();
    }
    return true;
  };

  const handleSubmit = () => {
    const success = send(prompt);
    if (!success) return;
    setPrompt("");
    setUIState({ suggestionsUsed: true });
    setCurrentChat((currentChat) =>
      currentChat.firstUserMessage
        ? currentChat
        : {
            ...currentChat,
            firstUserMessage: prompt,
          }
    );
  };

  const pendingAttachments = attachments.some(
    (a) => a.status.type !== "complete"
  );

  const stopAllLabel = t("stopAllLabel");
  const sendLabel = t("sendLabel");

  return (
    <div
      className="relative flex w-full flex-col gap-0 cursor-text"
      onClick={handleContainerClick}
    >
      {/* Input box (top section) */}
      <textarea
        placeholder={t("placeholder")}
        name="global-composer"
        autoFocus
        className="bg-muted border-border dark:border-muted-foreground/15 focus:outline-primary placeholder:text-muted-foreground max-h-[calc(50dvh)] min-h-16 w-full resize-none rounded-t-2xl border-x border-t px-4 pt-2 pb-3 text-base outline-none"
        rows={1}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            if (pendingAttachments) {
              return;
            }
            e.preventDefault();
            handleSubmit();
          }
          // Shift/Ctrl/Cmd+Enter falls through to add newline
        }}
        ref={textareaRef}
      />
      {/* Footer with attach and send, styled like thread composer */}
      <div className="bg-muted border-border dark:border-muted-foreground/15 relative flex items-start justify-between rounded-b-2xl border-x border-b p-2 cursor-text">
        <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-2">
          <ReasoningSliderTrigger />
          <ComposerAddAttachment />
          {attachments.map((a) => (
            <AttachmentChip
              key={`${a.id}`}
              attachment={a}
              onRemove={() => removeAttachment(a)}
            />
          ))}
        </div>

        {onStopAll ? (
          <StopButton
            onClick={onStopAll}
            aria-label={stopAllLabel}
            title={stopAllLabel}
            className="self-start"
          />
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            aria-label={sendLabel}
            title={sendLabel}
            className="self-start"
            disabled={pendingAttachments}
          >
            <ArrowUpIcon className="size-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
