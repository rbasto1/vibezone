"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmCloseModalProps {
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
  onMove: () => void;
  isProcessing?: boolean;
}

export const ConfirmCloseModal = ({
  onOpenChange,
  onDiscard,
  onMove,
  isProcessing = false,
}: ConfirmCloseModalProps) => {
  const t = useTranslations("ConfirmCloseModal");
  const handleDiscard = () => {
    onOpenChange(false);
    onDiscard();
  };

  const handleMove = () => {
    onOpenChange(false);
    onMove();
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("descriptionPrimary")}</DialogDescription>
          <DialogDescription>{t("descriptionMove")}</DialogDescription>
          <DialogDescription>{t("descriptionDiscard")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            {t("cancel")}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={handleMove}
              disabled={isProcessing}
            >
              {t("move")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDiscard}
              disabled={isProcessing}
            >
              {t("discard")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
