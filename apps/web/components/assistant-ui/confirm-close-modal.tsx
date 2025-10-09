"use client";

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
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";

export interface ConfirmCloseModalProps {
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export const ConfirmCloseModal = ({
  onOpenChange,
  onConfirm,
}: ConfirmCloseModalProps) => {
  const t = useTranslations("ConfirmCloseModal");
  const [skipConfirmation, setSkipConfirmation] = useState(false);
  const user = useUser();
  const [preferences, setPreferences] = useUserPreferences();
  const updatePreferences = trpc.users.updatePreferences.useMutation({
    onError: (error: unknown) => {
      console.error("Error saving skip-close preference:", error);
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(t("saveError", { message }));
    },
  });

  const handleConfirm = () => {
    if (skipConfirmation && !preferences.skipCloseThreadConfirmation) {
      setPreferences((prev) =>
        prev.skipCloseThreadConfirmation
          ? prev
          : { ...prev, skipCloseThreadConfirmation: true }
      );
      if (user) {
        updatePreferences.mutate({ skipCloseThreadConfirmation: true });
      }
    }

    onOpenChange(false);
    onConfirm();
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("descriptionLoss")}</DialogDescription>
          <DialogDescription>{t("descriptionAlternate")}</DialogDescription>
          <DialogDescription>{t("descriptionConfirm")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipConfirmation}
              onChange={(event) => setSkipConfirmation(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>{t("skipLabel")}</span>
          </label>
          {!user && (
            <p className="text-xs text-muted-foreground">{t("skipHint")}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            {t("confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
