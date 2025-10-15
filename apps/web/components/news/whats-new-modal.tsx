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
import { trpc } from "@/lib/trpc/client";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const LOCAL_STORAGE_KEY = "whats-new:last-dismissed-at";

type NewsForLocale = Pick<NewsArticle, "id" | "createdAt"> & {
  titleText: string;
  bodyText: string;
};

interface WhatsNewModalProps {
  items: NewsForLocale[];
  lastNewsSeenAt: Date | null;
}

export const WhatsNewModal = ({
  items,
  lastNewsSeenAt,
}: WhatsNewModalProps) => {
  const authUser = useAuthContext();
  const [dismissed, setDismissed] = useState(false);
  const markNewsSeenMutation = trpc.news.markNewsSeen.useMutation();
  const t = useTranslations("WhatsNew");

  const unseenItems = useMemo(() => {
    const resolvedLastSeen = getLastSeen(lastNewsSeenAt);
    if (!resolvedLastSeen) return items;
    return items.filter((item) => item.createdAt > resolvedLastSeen);
  }, [items, lastNewsSeenAt]);

  if (dismissed || unseenItems.length === 0) {
    return null;
  }

  const handleDismiss = () => {
    const lastNewsSeenAt = unseenItems[0]?.createdAt ?? new Date();
    setDismissed(true);
    localStorage.setItem(LOCAL_STORAGE_KEY, lastNewsSeenAt.toISOString());
    if (authUser) {
      void markNewsSeenMutation.mutateAsync(
        { lastNewsSeenAt },
        {
          onError: (error) => {
            console.error("Failed to mark news as seen:", error);
          },
        }
      );
    }
  };

  return (
    <Dialog open onOpenChange={handleDismiss}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-2">
          {unseenItems.map((item) => (
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
          <Button onClick={handleDismiss} variant="outline">
            {t("dismiss")}
          </Button>
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
