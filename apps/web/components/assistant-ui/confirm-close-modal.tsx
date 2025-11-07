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
import { useUserPreferencesSetter } from "@/hooks/use-user-preferences";
import { useUser } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";

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
  const [skipConfirmation, setSkipConfirmation] = useState(false);
  const user = useUser();
  const setPreferences = useUserPreferencesSetter();
  const updatePreferences = trpc.users.updatePreferences.useMutation({
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      toast.error(t("saveError", { message }));
    },
  });

  const persistSkipPreference = () => {
    if (!skipConfirmation) return;
    setPreferences((prev) =>
      prev.skipCloseThreadConfirmation
        ? prev
        : { ...prev, skipCloseThreadConfirmation: true }
    );
    if (user) {
      updatePreferences.mutate({ skipCloseThreadConfirmation: true });
    }
  };

  const handleDiscard = () => {
    persistSkipPreference();
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
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipConfirmation}
              onChange={(event) => setSkipConfirmation(event.target.checked)}
              className="h-4 w-4"
            />
            <span>{t("skipLabel")}</span>
          </label>
          {!user && (
            <p className="text-xs text-muted-foreground">{t("skipHint")}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing || skipConfirmation}
          >
            {t("cancel")}
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={handleMove}
              disabled={isProcessing || skipConfirmation}
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
