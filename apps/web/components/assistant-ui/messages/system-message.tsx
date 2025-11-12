"use client";

import {
  MessagePrimitive,
  useAssistantState,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { motion } from "framer-motion";
import { AsteriskIcon, ScrollTextIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useMemo,
  useState,
  type FC,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Chip, ChipLabel, ChipLeading } from "@/components/ui/chip";
import type {
  MessageMetadata,
  SystemMessageInstruction,
} from "@vibezone/database";
import { InstructionDetailsModal } from "../threads/instruction-details-modal";

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

export const SystemMessage: FC = () => {
  const message = useAssistantState(({ message }) => message);
  const [modalPayload, setModalPayload] = useState<ModalPayload>();
  const t = useTranslations();

  const systemText = useMemo(() => textFromSystemMessage(message), [message]);

  const instructions = (message?.metadata as MessageMetadata | undefined)
    ?.custom?.instructions;

  const hasSystemText = !!systemText.length;
  const hasInstructions = !!instructions?.length;
  const showFallback = hasSystemText && !hasInstructions;
  const defaultSystemMessage = t("Prompts.system");

  if (
    (!hasInstructions && !showFallback) ||
    systemText === defaultSystemMessage
  ) {
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

  const handleChip = (payload: ModalPayload): (() => void) => {
    return () => setModalPayload(payload);
  };

  const renderChip = (
    key: string,
    leading: ReactNode,
    label: string,
    payload: ModalPayload,
    ariaLabel: string
  ) => (
    <Chip
      key={key}
      role="button"
      tabIndex={0}
      onClick={handleChip(payload)}
      onKeyDown={(event) => handleKeyActivate(event, payload)}
      aria-label={ariaLabel}
      className="cursor-pointer bg-muted/80 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 max-w-[14rem] h-7 pl-1.5 pr-3"
    >
      <ChipLeading className="bg-transparent shadow-none size-4">
        {leading}
      </ChipLeading>
      <ChipLabel title={label}>{label}</ChipLabel>
    </Chip>
  );

  return (
    <>
      <MessagePrimitive.Root asChild>
        <motion.div
          className="mx-auto w-full max-w-[var(--thread-max-width)] px-[var(--thread-padding-x)] py-4"
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          data-role="system"
        >
          <div className="flex flex-wrap items-center gap-2 pb-2">
            {instructions?.map((instruction) => {
              const content = getInstructionContent(systemText, instruction);
              const label =
                instruction.title || t("ThreadInstructions.fallbackTitle");
              return renderChip(
                instruction.id,
                instruction.project ? (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: instruction.project.color }}
                    aria-hidden="true"
                  />
                ) : (
                  <AsteriskIcon className="size-4 text-muted-foreground" />
                ),
                label,
                {
                  title: label,
                  content,
                  project: instruction.project,
                },
                t("ThreadInstructions.viewInstruction", { title: label })
              );
            })}
            {showFallback &&
              renderChip(
                "system-fallback",
                <ScrollTextIcon className="size-4 text-muted-foreground" />,
                t("ThreadInstructions.systemMessage"),
                {
                  title: t("ThreadInstructions.systemMessage"),
                  content: systemText,
                  project: undefined,
                },
                t("ThreadInstructions.viewSystemMessage")
              )}
          </div>
        </motion.div>
      </MessagePrimitive.Root>
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
