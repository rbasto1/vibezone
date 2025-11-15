"use client";

import {
  MessagePrimitive,
  useAssistantState,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { motion } from "framer-motion";
import { AsteriskIcon, BrainIcon, ScrollTextIcon } from "lucide-react";
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
  SystemMessageMemory,
} from "@vibezone/database";
import {
  InstructionDetailsModal,
  type InstructionDetailsEntry,
  type InstructionDetailsPayload,
} from "../threads/instruction-details-modal";

type ModalTarget =
  | {
      type: "instruction";
      instructionId: string;
    }
  | {
      type: "memories";
    }
  | {
      type: "system";
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
  instruction: SystemMessageInstruction | SystemMessageMemory
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
  const [modalTarget, setModalTarget] = useState<ModalTarget>();
  const t = useTranslations();

  const systemText = useMemo(() => textFromSystemMessage(message), [message]);

  const customMetadata = (message?.metadata as MessageMetadata | undefined)
    ?.custom;
  const instructions = customMetadata?.instructions;
  const memories = customMetadata?.memories;
  const memoryCount = memories?.length ?? 0;
  const memoryChipLabel =
    memoryCount > 0
      ? t("ThreadMemories.chipLabel", { count: memoryCount })
      : "";
  const modalPayload = useMemo<InstructionDetailsPayload | undefined>(() => {
    if (!modalTarget) {
      return undefined;
    }
    if (modalTarget.type === "instruction") {
      const instruction = instructions?.find(
        ({ id }) => id === modalTarget.instructionId
      );
      if (!instruction) {
        return undefined;
      }
      const label =
        instruction.title || t("ThreadInstructions.fallbackTitle");
      return {
        mode: "single",
        title: label,
        content: getInstructionContent(systemText, instruction),
        project: instruction.project,
      };
    }
    if (modalTarget.type === "memories") {
      if (!memories?.length) {
        return undefined;
      }
      const entries: InstructionDetailsEntry[] = memories.map((memory) => ({
        id: `memory-${memory.id}`,
        title: memory.title || t("ThreadMemories.fallbackTitle"),
        content: getInstructionContent(systemText, memory),
        project: memory.project,
      }));
      return {
        mode: "memories",
        title: t("ThreadMemories.chipLabel", { count: entries.length }),
        entries,
      };
    }
    return {
      mode: "single",
      title: t("ThreadInstructions.systemMessage"),
      content: systemText,
      project: undefined,
    };
  }, [
    instructions,
    memories,
    modalTarget,
    systemText,
    t,
  ]);

  const hasSystemText = !!systemText.length;
  const hasInstructions = !!instructions?.length;
  const hasMemories = !!memories?.length;
  const showFallback = hasSystemText && !hasInstructions && !hasMemories;
  const defaultSystemMessage = t("Prompts.system");

  if (
    (!hasInstructions && !hasMemories && !showFallback) ||
    systemText === defaultSystemMessage
  ) {
    return null;
  }

  const handleKeyActivate = (
    event: KeyboardEvent<HTMLDivElement>,
    target: ModalTarget
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setModalTarget(target);
    }
  };

  const renderChip = (
    key: string,
    leading: ReactNode,
    label: string,
    target: ModalTarget,
    ariaLabel: string
  ) => (
    <Chip
      key={key}
      role="button"
      tabIndex={0}
      onClick={() => setModalTarget(target)}
      onKeyDown={(event) => handleKeyActivate(event, target)}
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
                  type: "instruction",
                  instructionId: instruction.id,
                },
                t("ThreadInstructions.viewInstruction", { title: label })
              );
            })}
            {memoryCount > 0 &&
              renderChip(
                "memory-group",
                <BrainIcon className="size-4 text-muted-foreground" />,
                memoryChipLabel,
                {
                  type: "memories",
                },
                t("ThreadMemories.viewMemories", { count: memoryCount })
              )}
            {showFallback &&
              renderChip(
                "system-fallback",
                <ScrollTextIcon className="size-4 text-muted-foreground" />,
                t("ThreadInstructions.systemMessage"),
                {
                  type: "system",
                },
                t("ThreadInstructions.viewSystemMessage")
              )}
          </div>
        </motion.div>
      </MessagePrimitive.Root>
      {modalPayload && (
        <InstructionDetailsModal
          payload={modalPayload}
          onClose={() => setModalTarget(undefined)}
        />
      )}
    </>
  );
};
