"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Instruction } from "@/components/ui/instruction";
import type { SystemMessageInstructionProjectSnapshot } from "@vibezone/database";
import { AsteriskIcon, ScrollTextIcon } from "lucide-react";
import type { FC } from "react";

interface InstructionDetailsModalProps {
  title: string;
  content: string;
  project: SystemMessageInstructionProjectSnapshot | null | undefined;
  onClose: () => void;
}

export const InstructionDetailsModal: FC<InstructionDetailsModalProps> = ({
  title,
  content,
  project,
  onClose,
}) => {
  return (
    <Dialog
      defaultOpen
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-2">
          <DialogTitle>{title}</DialogTitle>
          {project ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: project.color }}
                aria-hidden="true"
              />
              <span>{project.name}</span>
            </div>
          ) : project === null ? (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <AsteriskIcon className="size-3.5" />
              <span>Applies to all chats</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ScrollTextIcon className="size-3.5" />
              <span>Imported system message</span>
            </div>
          )}
        </DialogHeader>
        <Instruction content={content} />
      </DialogContent>
    </Dialog>
  );
};
