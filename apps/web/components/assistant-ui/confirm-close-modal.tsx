"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

type ConfirmCloseModalProps = {
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ConfirmCloseModal({
  onOpenChange,
  onConfirm,
}: ConfirmCloseModalProps) {
  const t = useTranslations("ConfirmCloseModal");

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("descriptionLoss")}</DialogDescription>
          <DialogDescription>{t("descriptionAlternate")}</DialogDescription>
          <DialogDescription>{t("descriptionConfirm")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
