"use client";

import { ArrowDownToLine } from "lucide-react";
import type { FC } from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { createObjectUrl } from "@/lib/object-url";
import { useMessagePartFile } from "@assistant-ui/react";
import { Image } from "./assistant-message-part-image";
import { useTranslations } from "next-intl";

export const File: FC = () => {
  const t = useTranslations("AssistantMessageFile");
  const filePart = useMessagePartFile();
  const isImage = filePart.mimeType === "image";
  const [objectUrl, setObjectUrl] = useState<string>();

  useEffect(() => {
    if (isImage) return;
    const url = createObjectUrl(filePart.data, filePart.mimeType);
    setObjectUrl(url ?? undefined);

    if (!url || url.startsWith("http") || url.startsWith("data:"))
      return () => undefined;

    return () => URL.revokeObjectURL(url);
  }, [filePart.data, filePart.mimeType, isImage]);

  const filename = filePart.filename ?? t("defaultFilename");
  const statusLabel =
    filePart.status.type === "running"
      ? t("statusPreparing")
      : filePart.status.type === "incomplete"
        ? t("statusFailed")
        : null;

  if (isImage) {
    return (
      <Image src={filePart.data} status={filePart.status} filename={filename} />
    );
  }

  return (
    <div className="aui-assistant-file mt-4 inline-flex flex-col gap-2">
      <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-muted-foreground/80">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium text-foreground/80">
            {filename}
          </span>
          <span className="text-xs text-muted-foreground">
            {filePart.mimeType}
          </span>
          {statusLabel ? (
            <span className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground/70">
              {statusLabel}
            </span>
          ) : null}
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={cn(
            "gap-1.5",
            objectUrl ? "" : "cursor-not-allowed opacity-60"
          )}
          disabled={!objectUrl}
        >
          <a
            href={objectUrl ?? undefined}
            download={filename}
            target="_blank"
            rel="noreferrer"
          >
            <ArrowDownToLine className="size-4" />
            <span className="text-xs uppercase tracking-[0.26em]">
              {t("download")}
            </span>
          </a>
        </Button>
      </div>
    </div>
  );
};
