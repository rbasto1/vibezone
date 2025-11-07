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
import { modelMap } from "@/lib/model-map";
import { useTranslations } from "next-intl";
import type { FC } from "react";

interface CopyConversationModalProps {
  options: Array<{ id: string; modelId: string }>;
  onSelect: (threadId: string) => void;
  onCancel: () => void;
}

export const CopyConversationModal: FC<CopyConversationModalProps> = ({
  options,
  onSelect,
  onCancel,
}) => {
  const t = useTranslations("AssistantHeader");

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("copyModalTitle")}</DialogTitle>
          <DialogDescription>{t("copyModalDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {options.map((option) => {
            const label = modelMap.get(option.modelId)?.name ?? option.modelId;
            return (
              <Button
                key={option.id}
                variant="outline"
                onClick={() => onSelect(option.id)}
              >
                {label}
              </Button>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t("copyModalCancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
