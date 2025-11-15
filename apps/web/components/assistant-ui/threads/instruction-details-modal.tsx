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

export interface InstructionDetailsPayload {
  title: string;
  content: string;
  project: SystemMessageInstructionProjectSnapshot | null | undefined;
}

interface InstructionDetailsModalProps {
  payload: InstructionDetailsPayload;
  onClose: () => void;
}

const renderProjectDetails = (
  project: SystemMessageInstructionProjectSnapshot | null | undefined
) => {
  if (project) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: project.color }}
          aria-hidden="true"
        />
        <span>{project.name}</span>
      </div>
    );
  }
  if (project === null) {
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <AsteriskIcon className="size-3.5" />
        <span>Applies to all chats</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <ScrollTextIcon className="size-3.5" />
      <span>Imported system message</span>
    </div>
  );
};

export const InstructionDetailsModal: FC<InstructionDetailsModalProps> = ({
  payload,
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
          <DialogTitle>{payload.title}</DialogTitle>
          {renderProjectDetails(payload.project)}
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          <Instruction content={payload.content} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
