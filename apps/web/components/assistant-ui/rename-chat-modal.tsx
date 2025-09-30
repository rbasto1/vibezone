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
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useState, type FC } from "react";

interface RenameChatModalProps {
  chatId: string;
  currentTitle: string;
  onRename: (chatId: string, newTitle: string) => Promise<unknown>;
  onClose: () => void;
}

export const RenameChatModal: FC<RenameChatModalProps> = ({
  chatId,
  currentTitle,
  onRename,
  onClose,
}) => {
  const t = useTranslations("RenameChatModal");
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || newTitle.trim() === currentTitle) {
      onClose();
      return;
    }

    setIsRenaming(true);
    try {
      await onRename(chatId, newTitle.trim());
      onClose();
    } catch (error) {
      console.error("Failed to rename chat:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-[425px]"
        aria-describedby="rename-chat-description"
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription id="rename-chat-description">
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("placeholder")}
              autoFocus
              disabled={isRenaming}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isRenaming}
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isRenaming || !newTitle.trim()}
              loading={isRenaming}
            >
              {t("rename")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
