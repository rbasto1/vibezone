"use client";
import { ArrowUpIcon } from "lucide-react";
import type { FC, MouseEvent } from "react";
import { useContext, useMemo, useRef } from "react";
import { toast } from "sonner";

import { useStateSessionStorage } from "@/hooks/use-session-storage";

import { GlobalComposerContext } from "@/components/providers/composer-provider";
import {
  useAttachmentsValue,
  useClearAttachments,
  useCompleteAttachmentsValue,
  useRemoveAttachment,
} from "@/hooks/use-attachments";

import { Button } from "@/components/ui/button";
import { StopButton } from "@/components/ui/stop-button";
import { useAnonQuotaSetter, useAnonRemaining } from "@/hooks/use-anon-quota";
import { useCurrentChatSetter } from "@/hooks/use-chat";
import { usePanelStateSetter } from "@/hooks/use-panels";
import { useSession } from "@/hooks/use-session";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { ANON_DAILY_LIMIT } from "@/store/anon-quota";
import type { PanelState } from "@/store/panels";
import { ComposerAddAttachment } from "./add-attachment";
import { AttachmentChip } from "./attachment-chip";

interface GlobalComposerProps {
  panelsState: Record<string, PanelState>;
}

export const GlobalComposer: FC<GlobalComposerProps> = ({ panelsState }) => {
  const [prompt, setPrompt] = useStateSessionStorage("prompt");
  const removeAttachment = useRemoveAttachment();
  const attachments = useAttachmentsValue();
  const completeAttachments = useCompleteAttachmentsValue();
  const setCurrentChat = useCurrentChatSetter();
  const setUIState = useUIStateSetter();
  const remaining = useAnonRemaining();
  const clearAttachments = useClearAttachments();
  const setPanelState = usePanelStateSetter();
  const setAnonUsage = useAnonQuotaSetter();
  const session = useSession();
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
      toast.error(`Some panels failed to stop: ${failures.join("; ")}`);
    }
  };

  const onStopAll = anyPanelRunning ? handleStopAll : null;

  const send = (text: string): boolean => {
    const msg = text.trim();
    if (!msg || !completeAttachments) return false;

    const runtimes = getRuntimes();
    const isLoggedIn = !!session?.user;
    if (!isLoggedIn) {
      // Anonymous quota enforcement
      if (remaining < runtimes.size) {
        toast.error(
          `Guest limit reached (${ANON_DAILY_LIMIT}/day). Please sign in.`
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
        const message = e instanceof Error ? e.message : String(e);
        toast.error(`Send failed for a panel: ${message}`);
      }
    }

    // Update panel states to running
    runningPanels.forEach((panelId) => {
      setPanelState(panelId, (currentState) => ({
        ...currentState,
        running: true,
        error: undefined,
      }));
    });

    // After successfully enqueuing messages, consume credits for guests
    if (!isLoggedIn && runningPanels.length) {
      setAnonUsage((prev) => ({
        date: prev.date,
        count: prev.count + runningPanels.length,
      }));
    }

    clearAttachments();
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

  return (
    <div
      className="relative flex w-full flex-col gap-0 cursor-text"
      onClick={handleContainerClick}
    >
      {/* Input box (top section) */}
      <textarea
        placeholder="Ask all of the AIs..."
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
            aria-label="Stop all AI responses"
            title="Stop all AI responses"
            className="self-start"
          />
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            aria-label="Send to all AIs"
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
