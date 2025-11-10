"use client";

import { useTranslations } from "next-intl";
import type { FC, MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { TooltipIconButton } from "@/components/assistant-ui/messages/tooltip-icon-button";
import { cn } from "@/components/ui/utils";
import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { useAssistantState, type ThreadMessageLike } from "@assistant-ui/react";
import type {
  MessageMetadata,
  MessageRate,
  MessageRatingAttachment,
} from "@vibezone/database";
import type { LucideIcon } from "lucide-react";
import { FrownIcon, SmileIcon, SmilePlusIcon } from "lucide-react";
import { toast } from "sonner";

interface RateOption {
  value: MessageRate;
  Icon: LucideIcon;
  translationKey: "dislike" | "like" | "reallyLike";
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
  const message = useAssistantState(({ message }) => message);
  const thread = useAssistantState(({ thread }) => thread);
  const rateMutation = trpc.messages.rateMessage.useMutation();
  const rateAnonymousMutation =
    trpc.messages.rateMessageAnonymous.useMutation();
  const user = useUser();
  const [anonymousRatingId, setAnonymousRatingId] = useState<string>();

  const messageId = message.id;

  const metadataRate = useMemo(() => {
    const rateValue = (message.metadata as MessageMetadata)?.custom?.rate;
    return rateValue ?? null;
  }, [message.metadata]);

  const [optimisticRate, setOptimisticRate] = useState(metadataRate);

  useEffect(() => {
    setOptimisticRate(metadataRate);
    if (metadataRate == null) {
      setAnonymousRatingId(undefined);
    }
  }, [metadataRate, messageId]);

  if (message.role !== "assistant") return null;

  const handleSelect = (
    event: MouseEvent<HTMLButtonElement>,
    option: MessageRate
  ) => {
    event.preventDefault();

    const nextRate = optimisticRate === option ? null : option;
    const previousRate = optimisticRate;

    setOptimisticRate(nextRate);

    type HandleErrorFunction = NonNullable<
      Parameters<typeof rateMutation.mutate>[1]
    >["onError"] &
      NonNullable<
        Parameters<typeof rateAnonymousMutation.mutate>[1]
      >["onError"];

    const handleError: HandleErrorFunction = (error) => {
      toast.error(`Failed to rate message: ${error.message}`);
      setOptimisticRate(previousRate);
    };

    if (user) {
      rateMutation.mutate(
        {
          messageId,
          rate: nextRate,
        },
        { onError: handleError }
      );
      return;
    }

    if (nextRate === null) {
      if (!anonymousRatingId) {
        return;
      }

      rateAnonymousMutation.mutate(
        {
          ratingId: anonymousRatingId,
          rate: null,
        },
        {
          onError: handleError,
          onSuccess: (data) => {
            setAnonymousRatingId(data.ratingId ?? undefined);
          },
        }
      );
      return;
    }

    const previousUserMessage = thread.messages.find(
      (msg) => msg.id === message.parentId
    );
    const attachments = getMessageAttachments(message);
    const responseText = ensureNonEmpty(getMessagePlainText(message));
    const promptText = ensureNonEmpty(getMessagePlainText(previousUserMessage));

    rateAnonymousMutation.mutate(
      {
        ratingId: anonymousRatingId ?? undefined,
        prompt: promptText,
        response: responseText,
        attachments,
        rate: nextRate,
      },
      {
        onError: handleError,
        onSuccess: (data) => {
          setAnonymousRatingId(data.ratingId ?? undefined);
        },
      }
    );
  };

  return (
    <div className="flex">
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
            className={cn(
              "data-[selected=true]:text-amber-600 transition-all duration-200 overflow-hidden",
              isSelected || !optimisticRate
                ? "w-6 opacity-100"
                : "w-0 size-0 opacity-0 p-0"
            )}
            disabled={rateMutation.isPending || rateAnonymousMutation.isPending}
          >
            <Icon className="size-4" />
          </TooltipIconButton>
        );
      })}
    </div>
  );
};

const getMessagePlainText = (message?: ThreadMessageLike): string => {
  if (!message) return "";

  const { content } = message;
  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) => {
      if (!part || typeof part !== "object" || !("type" in part)) {
        return "";
      }
      if ("text" in part) {
        return part.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
};

const getMessageAttachments = (
  message?: ThreadMessageLike
): MessageRatingAttachment[] => {
  if (!message) return [];

  const summaries: MessageRatingAttachment[] = [];
  const seen = new Set<string>();

  const pushAttachment = (filename?: unknown, mimeType?: unknown) => {
    if (typeof filename !== "string" || filename.trim().length === 0) {
      return;
    }

    const normalizedFilename = filename.trim();
    const normalizedMime =
      typeof mimeType === "string" && mimeType.trim().length
        ? mimeType.trim()
        : undefined;

    const key = `${normalizedFilename}|${normalizedMime ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);

    summaries.push(
      normalizedMime
        ? { filename: normalizedFilename, mimeType: normalizedMime }
        : { filename: normalizedFilename }
    );
  };

  if (Array.isArray(message.attachments)) {
    for (const attachment of message.attachments) {
      if (!attachment || typeof attachment !== "object") continue;
      const record = attachment as Record<string, unknown>;
      pushAttachment(
        record.filename ?? record.name,
        record.mimeType ?? record.type
      );
    }
  }

  if (Array.isArray(message.content)) {
    for (const part of message.content) {
      if (!part || typeof part !== "object" || !("type" in part)) continue;
      const partRecord = part as Record<string, unknown>;
      const type = partRecord.type;
      if (type === "file" || type === "image") {
        pushAttachment(
          partRecord.filename ?? partRecord.name,
          partRecord.mimeType ?? partRecord.type
        );
      }
    }
  }

  return summaries;
};

const ensureNonEmpty = (value: string): string => {
  return value.trim() || "[empty]";
};
