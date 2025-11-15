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

export interface InstructionDetailsEntry {
  id: string;
  title: string;
  content: string;
  project: SystemMessageInstructionProjectSnapshot | null | undefined;
}

export type InstructionDetailsPayload =
  | {
      mode: "single";
      title: string;
      content: string;
      project: SystemMessageInstructionProjectSnapshot | null | undefined;
    }
  | {
      mode: "memories";
      title: string;
      entries: InstructionDetailsEntry[];
    };

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
          {payload.mode === "single" && renderProjectDetails(payload.project)}
        </DialogHeader>
        {payload.mode === "single" ? (
          <Instruction content={payload.content} />
        ) : (
          <div className="space-y-4">
            {payload.entries.map((entry) => (
              <div key={entry.id} className="space-y-2">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">
                    {entry.title}
                  </p>
                  {entry.project !== undefined &&
                    renderProjectDetails(entry.project)}
                </div>
                <Instruction content={entry.content} />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
