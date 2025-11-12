"use client";

import { Chip, ChipLabel, ChipLeading } from "@/components/ui/chip";
import { cn } from "@/components/ui/utils";
import { useThreadMessagesValue } from "@/hooks/use-thread-messages";
import type { ThreadMessageLike } from "@assistant-ui/react";
import type {
  MessageMetadata,
  SystemMessageInstruction,
} from "@vibezone/database";
import { AsteriskIcon, ScrollTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type KeyboardEvent } from "react";
import { InstructionDetailsModal } from "./instruction-details-modal";

interface ThreadInstructionsProps {
  threadId: string;
}

type ModalPayload = {
  title: string;
  content: string;
  project?: SystemMessageInstruction["project"];
};

const textFromSystemMessage = (message: ThreadMessageLike | undefined) => {
  if (!message) return "";
  const { content } = message;
  if (Array.isArray(content)) {
    for (const entry of content) {
      if (
        entry &&
        typeof entry === "object" &&
        "type" in entry &&
        (entry as { type: string }).type === "text" &&
        "text" in entry &&
        typeof (entry as { text?: unknown }).text === "string"
      ) {
        return (entry as { text: string }).text;
      }
    }
    return "";
  }
  if (
    content &&
    typeof content === "object" &&
    "text" in content &&
    typeof (content as { text?: unknown }).text === "string"
  ) {
    return (content as { text: string }).text;
  }
  if (typeof content === "string") {
    return content;
  }
  return "";
};

const getInstructionContent = (
  text: string,
  instruction: SystemMessageInstruction
) => {
  if (!text.length) return "";
  const safeStart = Math.max(
    0,
    Math.min(text.length, instruction.contentStartAt)
  );
  const safeEnd = Math.max(
    safeStart,
    Math.min(text.length, safeStart + instruction.contentLength)
  );
  return text.slice(safeStart, safeEnd);
};

export const ThreadInstructions = ({ threadId }: ThreadInstructionsProps) => {
  const messages = useThreadMessagesValue(threadId);
  const [modalPayload, setModalPayload] = useState<ModalPayload>();
  const t = useTranslations("ThreadInstructions");

  const systemMessage = useMemo(
    () => messages.find((message) => message.role === "system"),
    [messages]
  );

  const systemText = useMemo(
    () => textFromSystemMessage(systemMessage),
    [systemMessage]
  );

  const instructions =
    (systemMessage?.metadata as MessageMetadata | undefined)?.custom
      ?.instructions ?? null;

  const showFallback =
    !!systemMessage && !!systemText && (!instructions || !instructions.length);

  if (!instructions?.length && !showFallback) {
    return null;
  }

  const handleKeyActivate = (
    event: KeyboardEvent<HTMLDivElement>,
    payload: ModalPayload
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setModalPayload(payload);
    }
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[var(--thread-max-width)] px-[var(--thread-padding-x)]">
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {instructions?.map((instruction) => {
            const content = getInstructionContent(systemText, instruction);
            const label = instruction.title || t("fallbackTitle");
            return (
              <Chip
                key={instruction.id}
                role="button"
                tabIndex={0}
                onClick={() =>
                  setModalPayload({
                    title: label,
                    content,
                    project: instruction.project,
                  })
                }
                onKeyDown={(event) =>
                  handleKeyActivate(event, {
                    title: label,
                    content,
                    project: instruction.project,
                  })
                }
                aria-label={t("viewInstruction", { title: label })}
                className={cn(
                  "cursor-pointer bg-muted/80 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 max-w-[14rem] h-7 pl-1.5 pr-3"
                )}
              >
                <ChipLeading className="bg-transparent shadow-none size-4">
                  {instruction.project ? (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: instruction.project.color }}
                      aria-hidden="true"
                    />
                  ) : (
                    <AsteriskIcon className="size-4 text-muted-foreground" />
                  )}
                </ChipLeading>
                <ChipLabel title={label}>{label}</ChipLabel>
              </Chip>
            );
          })}
          {showFallback ? (
            <Chip
              role="button"
              tabIndex={0}
              onClick={() =>
                setModalPayload({
                  title: t("systemMessage"),
                  content: systemText,
                  project: undefined,
                })
              }
              onKeyDown={(event) =>
                handleKeyActivate(event, {
                  title: t("systemMessage"),
                  content: systemText,
                  project: undefined,
                })
              }
              aria-label={t("viewSystemMessage")}
              className="cursor-pointer bg-muted/80 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 max-w-[14rem] h-7 pl-1.5 pr-3"
            >
              <ChipLeading className="bg-transparent shadow-none size-4">
                <ScrollTextIcon className="size-4 text-muted-foreground" />
              </ChipLeading>
              <ChipLabel>{t("systemMessage")}</ChipLabel>
            </Chip>
          ) : null}
        </div>
      </div>
      {modalPayload && (
        <InstructionDetailsModal
          title={modalPayload.title}
          content={modalPayload.content}
          project={modalPayload.project}
          onClose={() => setModalPayload(undefined)}
        />
      )}
    </>
  );
};
