"use client";
import { ArrowUpIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FC, MouseEvent } from "react";
import { useContext, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { GlobalComposerContext } from "@/components/providers/composer-provider";
import { Button } from "@/components/ui/button";
import { ReasoningSliderTrigger } from "@/components/ui/reasoning-slider-trigger";
import { StopButton } from "@/components/ui/stop-button";
import { ANON_DAILY_LIMIT, useAnonRemaining } from "@/hooks/use-anon-quota";
import {
  useAttachmentsValue,
  useClearAttachments,
  useCompleteAttachmentsValue,
  useRemoveAttachment,
} from "@/hooks/use-attachments";
import {
  captchaToken,
  useCaptchaRequested,
  useCaptchaStateValue,
} from "@/hooks/use-captcha";
import { useCurrentChatSetter } from "@/hooks/use-chat";
import { useModelsValue } from "@/hooks/use-models";
import { usePanelsConfigValue, usePanelsState } from "@/hooks/use-panels";
import { useUIStateSetter } from "@/hooks/use-ui-state";
import { useUser } from "@/lib/auth-client";
import { ComposerAddAttachment } from "./add-attachment";
import { AttachmentChip } from "./attachment-chip";
import { Captcha } from "./captcha";
import type { GlobalComposerTextareaHandle } from "./global-composer-textarea";
import { GlobalComposerTextarea } from "./global-composer-textarea";
import {
  IncompatibleAttachmentsModal,
  type IncompatibleAttachment,
} from "./incompatible-attachments-modal";

export const GlobalComposer: FC = () => {
  const t = useTranslations("GlobalComposer");
  const removeAttachment = useRemoveAttachment();
  const attachments = useAttachmentsValue();
  const pendingAttachments = attachments.some(
    (a) => a.status.type !== "complete"
  );
  const completeAttachments = useCompleteAttachmentsValue();
  const setCurrentChat = useCurrentChatSetter();
  const setUIState = useUIStateSetter();
  const remaining = useAnonRemaining();
  const clearAttachments = useClearAttachments();
  const [panelsState, setPanelsState] = usePanelsState();
  const panels = usePanelsConfigValue();
  const panelModelIds = useMemo(
    () => panels.map((panel) => panel.model),
    [panels]
  );
  const { models } = useModelsValue({ includeModels: panelModelIds });
  const user = useUser();
  const textareaRef = useRef<GlobalComposerTextareaHandle | null>(null);
  const anyPanelRunning = useMemo(
    () => Object.values(panelsState).some((p) => p.running),
    [panelsState]
  );
  const captchaState = useCaptchaStateValue();
  const setCaptchaRequested = useCaptchaRequested();
  const [incompatibleModalOpen, setIncompatibleModalOpen] = useState(false);
  const [incompatibleAttachments, setIncompatibleAttachments] = useState<
    IncompatibleAttachment[]
  >([]);

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

  // Validate attachment compatibility with selected models
  const validateAttachments = (): IncompatibleAttachment[] => {
    if (!completeAttachments?.length) {
      return [];
    }

    const modelsMap = new Map(models.map((model) => [model.id, model]));
    const incompatible: IncompatibleAttachment[] = [];

    for (const attachment of completeAttachments) {
      const incompatibleModels: Array<{ id: string; name: string }> = [];

      // Check each panel's model for compatibility
      for (const panel of panels) {
        const model = modelsMap.get(panel.model);
        if (!model) continue;

        // Determine attachment type and check compatibility
        const isImage = attachment.type === "image";
        const isPdf =
          attachment.type === "document" &&
          attachment.contentType === "application/pdf";

        if (isImage && !model.capVision) {
          incompatibleModels.push({ id: model.id, name: model.name });
        } else if (isPdf && !model.capPdf) {
          incompatibleModels.push({ id: model.id, name: model.name });
        }
      }

      if (incompatibleModels.length > 0) {
        incompatible.push({
          id: attachment.id,
          name: attachment.name,
          type: attachment.type,
          incompatibleModels,
        });
      }
    }

    return incompatible;
  };

  const send = (text: string): boolean => {
    const msg = text.trim();
    if (!msg || !completeAttachments) return false;

    // Validate attachments before sending
    const incompatible = validateAttachments();
    if (incompatible.length > 0) {
      setIncompatibleAttachments(incompatible);
      setIncompatibleModalOpen(true);
      return false;
    }

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
      clearAttachments();
    }
    return true;
  };

  const handleSubmit = async (prompt: string): Promise<boolean> => {
    if (pendingAttachments) return false;

    if (
      !captchaToken ||
      !captchaState.expiresAt ||
      captchaState.expiresAt < Date.now()
    ) {
      setCaptchaRequested();
      await captchaState.execution.promise;
      captchaState.execution.reset();
    }

    const success = send(prompt);
    if (!success) return false;

    setUIState({ suggestionsUsed: true });
    setCurrentChat((currentChat) =>
      currentChat.firstUserMessage
        ? currentChat
        : {
            ...currentChat,
            firstUserMessage: prompt,
          }
    );

    return true;
  };

  const stopAllLabel = t("stopAllLabel");
  const sendLabel = t("sendLabel");

  return (
    <>
      {incompatibleModalOpen && (
        <IncompatibleAttachmentsModal
          onOpenChange={setIncompatibleModalOpen}
          incompatibleAttachments={incompatibleAttachments}
          onRemoveAttachment={(attachmentId) => {
            const attachment = attachments.find((a) => a.id === attachmentId);
            if (attachment) {
              removeAttachment(attachment);
            }
            // Re-validate after removal
            const remaining = incompatibleAttachments.filter(
              (a) => a.id !== attachmentId
            );
            setIncompatibleAttachments(remaining);
            if (!remaining.length) {
              setIncompatibleModalOpen(false);
            }
          }}
          onClose={() => setIncompatibleModalOpen(false)}
        />
      )}
      <div
        className="relative flex w-full flex-col gap-0 cursor-text"
        onClick={handleContainerClick}
      >
        <Captcha />
        {/* Input box (top section) */}
        <GlobalComposerTextarea
          ref={textareaRef}
          placeholder={t("placeholder")}
          onSubmit={handleSubmit}
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
              onClick={() => textareaRef.current?.submit()}
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
    </>
  );
};
