"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NewsArticle } from "@/db";
import { useAuthContext } from "@/lib/auth-context";
import { formatDate } from "@/lib/format";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { trpc } from "@/lib/trpc/client";
import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const LOCAL_STORAGE_KEY = "whats-new:last-dismissed-at";

const resolveTranslation = (
  translations: Record<string, string>,
  locale: string
) => {
  const localized = translations[locale];
  if (typeof localized === "string" && localized.trim().length > 0) {
    return localized.trim();
  }

  const defaultTranslation = translations[DEFAULT_LOCALE];
  if (
    typeof defaultTranslation === "string" &&
    defaultTranslation.trim().length > 0
  ) {
    return defaultTranslation.trim();
  }

  const firstAvailable = Object.values(translations).find(
    (value) => typeof value === "string" && value.trim().length > 0
  );

  return firstAvailable?.trim() ?? "";
};

interface WhatsNewModalProps {
  items: Pick<NewsArticle, "id" | "title" | "body" | "createdAt">[];
  lastNewsSeenAt: Date | null;
}

export const WhatsNewModal = ({
  items,
  lastNewsSeenAt,
}: WhatsNewModalProps) => {
  const authUser = useAuthContext();
  const [dismissed, setDismissed] = useState(false);
  const markNewsSeenMutation = trpc.news.markNewsSeen.useMutation();
  const locale = useLocale();

  const unseenItems = useMemo(() => {
    const resolvedLastSeen = getLastSeen(lastNewsSeenAt);
    if (!resolvedLastSeen) return items;
    return items.filter((item) => item.createdAt > resolvedLastSeen);
  }, [items, lastNewsSeenAt]);

  const localizedItems = useMemo(() => {
    return unseenItems
      .map((item) => {
        const titleText = resolveTranslation(item.title, locale);
        const bodyText = resolveTranslation(item.body, locale);
        if (!titleText && !bodyText) {
          return null;
        }
        return { ...item, titleText, bodyText };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [unseenItems, locale]);

  if (dismissed || localizedItems.length === 0) {
    return null;
  }

  const handleDismiss = () => {
    const lastNewsSeenAt = localizedItems[0]?.createdAt ?? new Date();
    setDismissed(true);
    localStorage.setItem(LOCAL_STORAGE_KEY, lastNewsSeenAt.toISOString());
    if (authUser) {
      void markNewsSeenMutation.mutateAsync(
        { lastNewsSeenAt },
        {
          onError: (error) => {
            console.error("Failed to mark news as seen:", error);
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to update news status"
            );
          },
        }
      );
    }
  };

  return (
    <Dialog open onOpenChange={handleDismiss}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🥳 What&apos;s New</DialogTitle>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-2">
          {localizedItems.map((item) => (
            <article key={item.id} className="space-y-2 rounded-md border p-3">
              <header className="flex flex-col">
                <span className="text-xs text-muted-foreground">
                  {formatDate(item.createdAt)}
                </span>
                <h3 className="text-base font-medium">{item.titleText}</h3>
              </header>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {item.bodyText}
              </p>
            </article>
          ))}
        </div>
        <DialogFooter className="sm:justify-start">
          <Button onClick={handleDismiss}>Dismiss</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function getLastSeen(lastNewsSeenAt: Date | null) {
  if (lastNewsSeenAt) return lastNewsSeenAt;
  if (typeof localStorage === "undefined") return null;
  const savedValue = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!savedValue) return null;
  const parsed = new Date(savedValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
