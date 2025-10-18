"use client";

import { useTranslations } from "next-intl";
import type { FC, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/components/ui/utils";
import type {
  MessageMetadataCustom,
  MessageRate,
} from "@/db/json-columns-types";
import { useThreadMessagesSetter } from "@/hooks/use-thread-store";
import { trpc } from "@/lib/trpc/client";
import {
  useMessage,
  useThreadListItem,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import type { LucideIcon } from "lucide-react";
import { FrownIcon, SmileIcon, SmilePlusIcon } from "lucide-react";
import { toast } from "sonner";

interface RateOption {
  value: MessageRate;
  Icon: LucideIcon;
  translationKey: "dislike" | "like" | "reallyLike";
}

interface MetadataWithCustom {
  custom?: MessageMetadataCustom;
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

interface AssistantMessageRateControlProps {
  delayDuration?: number;
}

export const AssistantMessageRateControl: FC<
  AssistantMessageRateControlProps
> = ({ delayDuration }) => {
  const t = useTranslations("AssistantMessageRate");
  const message = useMessage();
  const thread = useThreadListItem();
  const setThreadMessages = useThreadMessagesSetter(thread.id);
  const rateMutation = trpc.messages.rateMessage.useMutation();

  const messageId = message?.id ?? null;

  const metadataRate = useMemo<MessageRate | null>(() => {
    const rateValue = (message?.metadata as MetadataWithCustom | undefined)
      ?.custom?.rate;
    return (rateValue as MessageRate | undefined) ?? null;
  }, [message?.metadata]);

  const [optimisticRate, setOptimisticRate] = useState<MessageRate | null>(
    metadataRate
  );

  useEffect(() => {
    setOptimisticRate(metadataRate);
  }, [metadataRate, messageId]);

  if (!thread.id || !messageId || message?.role !== "assistant") return null;

  const handleSelect = (
    event: MouseEvent<HTMLButtonElement>,
    option: MessageRate
  ) => {
    event.preventDefault();

    const nextRate = optimisticRate === option ? null : option;
    const previousRate = optimisticRate;

    setOptimisticRate(nextRate);
    setThreadMessages((prev) => applyRateToMessages(prev, messageId, nextRate));

    rateMutation.mutate(
      { messageId, rate: nextRate },
      {
        onError: (error) => {
          toast.error(`Failed to rate message: ${error.message}`);
          setOptimisticRate(previousRate);
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
        const isSelected = optimisticRate === value;

        return (
          <TooltipIconButton
            key={value}
            tooltip={t(translationKey)}
            delayDuration={delayDuration}
            aria-pressed={isSelected}
            data-selected={isSelected}
            onClick={(event) => handleSelect(event, value)}
            className={cn("data-[selected=true]:text-amber-600")}
            disabled={rateMutation.isPending}
          >
            <Icon className="size-4" />
          </TooltipIconButton>
        );
      })}
    </>
  );
};

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
