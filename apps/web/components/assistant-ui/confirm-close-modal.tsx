import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmCloseModalProps = {
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ConfirmCloseModal({
  onOpenChange,
  onConfirm,
}: ConfirmCloseModalProps) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close this chat?</DialogTitle>
          <DialogDescription>
            If you close the chat, your conversation with this AI will be lost.
          </DialogDescription>
          <DialogDescription>
            You can choose another model without closing the chat by clicking on
            the model name on the chat header.
          </DialogDescription>
          <DialogDescription>
            Are you sure you want to close this chat?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Close Chat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
