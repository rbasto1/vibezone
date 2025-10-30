import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { siteName } from "@/lib/branding";
import { trpc } from "@/lib/trpc/client";

interface PreferencesDataImportModalProps {
  onClose: () => void;
}

export const PreferencesDataImportModal = ({
  onClose,
}: PreferencesDataImportModalProps) => {
  const t = useTranslations("UserPreferences");
  const utils = trpc.useUtils();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState<{
    message: string;
    progress: number;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importCompleted, setImportCompleted] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportDialogChange = (open: boolean) => {
    if (!open && isImporting) {
      return;
    }
    if (!open) {
      onClose();
      setImportFile(null);
      setImportProgress(null);
      setImportCompleted(false);
      setImportError(null);
      setIsImporting(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile || isImporting) return;

    setIsImporting(true);
    setImportError(null);
    setImportProgress({
      message: t("myData.import.uploading"),
      progress: 0,
    });
    setImportCompleted(false);

    const formData = new FormData();
    formData.append("file", importFile);

    let completed = false;
    let encounteredError = false;

    const applyPayload = (payload: {
      type?: string;
      progress?: number;
      message?: string;
    }) => {
      if (!payload || typeof payload !== "object") return;
      const { type, progress, message } = payload;
      if (type === "progress") {
        if (!message) return;
        setImportProgress({
          message,
          progress: progress ?? 0,
        });
        return;
      }

      if (type === "complete") {
        if (message) {
          setImportProgress({
            message: "Loading chats…",
            progress: 99,
          });
        }
        void utils.chats.listChats.invalidate().then(() => {
          completed = true;
          setImportCompleted(true);
          if (message) {
            setImportProgress({
              message,
              progress: progress ?? 100,
            });
          }
          toast.success(t("myData.import.success"));
          setImportFile(null);
        });
        return;
      }

      if (type === "error") {
        const errorMessage =
          message ?? "Unexpected error while importing archive.";
        encounteredError = true;
        setImportError(errorMessage);
        setImportProgress(null);
        toast.error(t("myData.import.error", { message: errorMessage }));
      }
    };

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }

      const body = response.body;
      if (!body) {
        completed = true;
        setImportCompleted(true);
        toast.success(t("myData.import.success"));
        setImportFile(null);
        return;
      }

      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const payload: unknown = JSON.parse(line);
            applyPayload(
              payload as { type?: string; progress?: number; message?: string }
            );
          } catch (error: unknown) {
            console.error("[data-import] Failed to parse progress chunk:", {
              error,
              line,
            });
          }
        }
      }

      if (buffer.trim()) {
        try {
          const payload: unknown = JSON.parse(buffer);
          applyPayload(
            payload as { type?: string; progress?: number; message?: string }
          );
        } catch (error: unknown) {
          console.error("[data-import] Failed to parse trailing chunk:", {
            error,
            buffer,
          });
        }
      }

      if (!completed && !encounteredError) {
        setImportCompleted(true);
        toast.success(t("myData.import.success"));
        setImportFile(null);
        void utils.chats.listChats.invalidate();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected import error.";
      setImportError(message);
      setImportProgress(null);
      toast.error(t("myData.import.error", { message }));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open onOpenChange={handleImportDialogChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("myData.import.title")}</DialogTitle>
          <DialogDescription>
            {t("myData.import.instructions", { siteName })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label
            htmlFor="preferences-import-file"
            className="text-sm font-medium text-foreground cursor-pointer"
          >
            {t("myData.import.selectFile")}
          </label>
          <Input
            id="preferences-import-file"
            className="cursor-pointer"
            type="file"
            accept=".zip"
            onChange={(event) =>
              setImportFile(event.target.files?.item(0) ?? null)
            }
          />
          {importFile && (
            <p className="text-xs text-muted-foreground">{importFile.name}</p>
          )}
          {importProgress && (
            <div className="space-y-1 pt-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{
                    width: `${Math.min(
                      Math.max(Number(importProgress.progress) || 0, 0),
                      100
                    )}%`,
                    maxWidth: "100%",
                    minWidth: "0%",
                  }}
                />
              </div>
              <div className="flex items-center justify-between gap-3 text-xs font-medium text-foreground">
                <span className="max-w-[80%] overflow-hidden break-all">
                  {importProgress.message}
                </span>
                <span className="shrink-0">
                  {Math.round(
                    Math.min(Math.max(importProgress.progress, 0), 100)
                  )}
                  %
                </span>
              </div>
            </div>
          )}
          {importError && (
            <p className="text-xs text-destructive">{importError}</p>
          )}
        </div>
        <DialogFooter>
          {importCompleted ? (
            <Button onClick={() => handleImportDialogChange(false)}>
              {t("myData.import.done")}
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleImportDialogChange(false)}
                disabled={isImporting}
              >
                {t("actions.cancel")}
              </Button>
              <Button
                onClick={handleImportSubmit}
                disabled={!importFile || isImporting}
              >
                {isImporting
                  ? t("myData.import.inProgress")
                  : t("myData.import.submit")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
