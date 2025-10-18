"use client";

import { useTranslations } from "next-intl";
import type { FC, MouseEvent } from "react";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/components/ui/utils";
import type { MessageRate } from "@/db/json-columns-types";
import { useThreadMessagesSetter } from "@/hooks/use-thread-store";
import { trpc } from "@/lib/trpc/client";
import {
  useMessage,
  useThread,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import type { LucideIcon } from "lucide-react";
import { FrownIcon, SmileIcon, SmilePlusIcon } from "lucide-react";

interface RateOption {
  value: MessageRate;
  Icon: LucideIcon;
  translationKey: "dislike" | "like" | "reallyLike";
}

interface MetadataWithCustom {
  custom?: {
    rate?: MessageRate;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const RATE_OPTIONS: RateOption[] = [
  { value: "dislike", Icon: FrownIcon, translationKey: "dislike" },
  { value: "like", Icon: SmileIcon, translationKey: "like" },
  {
    value: "really-like",
    Icon: SmilePlusIcon,
    translationKey: "reallyLike",
  },
];

const applyRateToMessages = (
  messages: ThreadMessageLike[],
  messageId: string,
  rate: MessageRate | null
) =>
  messages.map((message) => {
    if (message.id !== messageId) return message;

    const metadata: MetadataWithCustom = {
      custom: {},
      ...(message.metadata ?? {}),
    };

    const custom: MetadataWithCustom["custom"] = {
      ...(metadata.custom ?? {}),
    };

    if (rate) {
      custom.rate = rate;
    } else {
      delete custom.rate;
    }

    return {
      ...message,
      metadata: {
        ...metadata,
        custom,
      },
    };
  });

export const AssistantMessageRateControl: FC = () => {
  const t = useTranslations("AssistantMessageRate");
  const message = useMessage();
  const threadId = useThread((state) => state.threadId);
  const setThreadMessages = useThreadMessagesSetter(threadId);
  const rateMutation = trpc.messages.rateMessage.useMutation();

  const messageId = message?.id;
  const currentRate =
    ((message?.metadata as MetadataWithCustom | undefined)?.custom?.rate as
      | MessageRate
      | undefined) ?? null;

  if (!messageId || message?.role !== "assistant") return null;
  if (
    message?.content
      .find((p) => p.type === "text")
      ?.text?.startsWith(" Aproximadamente")
  ) {
    console.log("metadata", message.metadata.custom);
  }

  const handleSelect = (
    event: MouseEvent<HTMLButtonElement>,
    option: MessageRate
  ) => {
    event.preventDefault();
    if (!threadId) return;
    const nextRate = currentRate === option ? null : option;
    const previousRate = currentRate;

    setThreadMessages((prev) => applyRateToMessages(prev, messageId, nextRate));

    rateMutation.mutate(
      { messageId, rate: nextRate },
      {
        onError: (error) => {
          console.error("Failed to rate message:", error);
          setThreadMessages((prev) =>
            applyRateToMessages(prev, messageId, previousRate)
          );
        },
      }
    );
  };

  return (
    <>
      {RATE_OPTIONS.map(({ value, Icon, translationKey }) => {
        const isSelected = currentRate === value;

        return (
          <TooltipIconButton
            key={value}
            tooltip={t(translationKey)}
            aria-pressed={isSelected}
            data-selected={isSelected}
            onClick={(event) => handleSelect(event, value)}
            className={cn(
              "data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary"
            )}
            disabled={rateMutation.isPending}
          >
            <Icon className="size-4" />
          </TooltipIconButton>
        );
      })}
    </>
  );
};
