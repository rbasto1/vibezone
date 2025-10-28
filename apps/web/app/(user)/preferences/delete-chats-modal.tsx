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
import { trpc } from "@/lib/trpc/client";

interface PreferencesDeleteChatsModalProps {
  onClose: () => void;
}

export const PreferencesDeleteChatsModal = ({
  onClose,
}: PreferencesDeleteChatsModalProps) => {
  const t = useTranslations("UserPreferences");
  const utils = trpc.useUtils();
  const deleteAllChatsMutation = trpc.chats.deleteAllChats.useMutation();
  const { isPending } = deleteAllChatsMutation;
  const [errorMessage, setErrorMessage] = useState<string>();

  const handleDialogChange = (open: boolean) => {
    if (open || isPending) {
      return;
    }
    setErrorMessage(undefined);
    onClose();
  };

  const handleDeleteChats = () => {
    setErrorMessage(undefined);
    deleteAllChatsMutation
      .mutateAsync()
      .then(() => {
        onClose();
        Promise.all([
          utils.chats.listChats.invalidate(),
          utils.chats.searchChats.invalidate(),
        ])
          .catch((error) => {
            console.error("Failed to invalidate chats after deletion:", error);
          })
          .finally(() => {
            toast.success(t("myData.delete.modal.success"));
          });
      })
      .catch((error) => {
        console.error("Failed to delete chats:", error);
        const message =
          error instanceof Error ? error.message : JSON.stringify(error);
        setErrorMessage(message);
        toast.error(t("myData.delete.modal.error", { message }));
      });
  };

  return (
    <Dialog open onOpenChange={handleDialogChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("myData.delete.modal.title")}</DialogTitle>
          <DialogDescription>
            {t("myData.delete.modal.description")}
          </DialogDescription>
        </DialogHeader>
        {errorMessage && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleDialogChange(false)}
            disabled={isPending}
          >
            {t("myData.delete.modal.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteChats}
            disabled={isPending}
          >
            {isPending
              ? t("myData.delete.modal.inProgress")
              : t("myData.delete.modal.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
