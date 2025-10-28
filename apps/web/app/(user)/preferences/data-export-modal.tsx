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
import { siteName } from "@/lib/branding";

interface PreferencesDataExportModalProps {
  onClose: () => void;
}

export const PreferencesDataExportModal = ({
  onClose,
}: PreferencesDataExportModalProps) => {
  const t = useTranslations("UserPreferences");
  const [isExporting, setIsExporting] = useState(false);
  const [exportQueued, setExportQueued] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExportDialogChange = (open: boolean) => {
    if (!open && isExporting) {
      return;
    }
    if (open) {
      setExportQueued(false);
      setExportError(null);
    } else {
      onClose();
      setExportError(null);
    }
  };

  const handleExportRequest = async () => {
    if (isExporting || exportQueued) return;
    setIsExporting(true);
    setExportError(null);
    let shouldCloseDialog = false;
    try {
      const response = await fetch("/api/export", {
        method: "POST",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || response.statusText);
      }
      await response.json();
      setExportQueued(true);
      toast.success(t("myData.export.success"));
      shouldCloseDialog = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected export error.";
      setExportError(message);
      toast.error(t("myData.export.error", { message }));
    } finally {
      setIsExporting(false);
      if (shouldCloseDialog) {
        onClose();
      }
    }
  };

  return (
    <Dialog open onOpenChange={handleExportDialogChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("myData.export.title")}</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>{t("myData.export.instructions", { siteName })}</p>
            <p>{t("myData.export.modalHint")}</p>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {exportQueued && (
            <p className="text-sm text-muted-foreground">
              {t("myData.export.success")}
            </p>
          )}
          {exportError && (
            <p className="text-sm text-destructive">{exportError}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleExportDialogChange(false)}
            disabled={isExporting}
          >
            {t("myData.export.cancel")}
          </Button>
          <Button
            onClick={handleExportRequest}
            disabled={isExporting || exportQueued}
          >
            {isExporting
              ? t("myData.export.inProgress")
              : t("myData.export.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
