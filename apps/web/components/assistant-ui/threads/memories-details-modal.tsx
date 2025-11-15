"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Instruction } from "@/components/ui/instruction";
import type { SystemMessageInstructionProjectSnapshot } from "@vibezone/database";
import { AsteriskIcon } from "lucide-react";
import type { FC } from "react";

export interface MemoriesDetailsEntry {
  id: string;
  title: string;
  content: string;
  project: SystemMessageInstructionProjectSnapshot | null;
}

interface MemoriesDetailsModalProps {
  title: string;
  entries: MemoriesDetailsEntry[];
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
  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <AsteriskIcon className="size-3.5" />
      <span>Applies to all chats</span>
    </div>
  );
};

export const MemoriesDetailsModal: FC<MemoriesDetailsModalProps> = ({
  title,
  entries,
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
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-2">
          {entries.map((entry, idx) => (
            <div key={`${entry.id}-${idx}`} className="space-y-2">
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
      </DialogContent>
    </Dialog>
  );
};
