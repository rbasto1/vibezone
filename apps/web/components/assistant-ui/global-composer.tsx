"use client";
import {
  useAttachmentsValue,
  useRemoveAttachment,
} from "@/hooks/use-attachments";
import type { Attachment } from "@assistant-ui/react";
import { ArrowUpIcon } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import { StopButton } from "../ui/stop-button";
import { ComposerAddAttachment } from "./add-attachment";
import { AttachmentChip } from "./attachment-chip";

export type GlobalComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStopAll: (() => void) | null;
};

export const GlobalComposer: React.FC<GlobalComposerProps> = ({
  value,
  onChange,
  onSubmit,
  onStopAll,
}) => {
  const removeAttachment = useRemoveAttachment();
  const attachments = useAttachmentsValue();
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const handleRemoveAttachment = (attachment: Attachment) => {
    removeAttachment(attachment);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't steal focus when clicking on actual buttons
    if (target.closest("button")) return;
    textareaRef.current?.focus();
  };

  const pendingAttachments = attachments.some(
    (a) => a.status.type !== "complete"
  );

  return (
    <div
      className="bg-background relative flex w-full flex-col gap-0 pb-4 md:pb-6 cursor-text"
      onClick={handleContainerClick}
    >
      {/* Input box (top section) */}
      <textarea
        placeholder="Ask all of the AIs..."
        name="global-composer"
        autoFocus
        className="bg-muted border-border dark:border-muted-foreground/15 focus:outline-primary placeholder:text-muted-foreground max-h-[calc(50dvh)] min-h-16 w-full resize-none rounded-t-2xl border-x border-t px-4 pt-2 pb-3 text-base outline-none"
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            if (pendingAttachments) {
              return;
            }
            e.preventDefault();
            onSubmit();
          }
          // Shift/Ctrl/Cmd+Enter falls through to add newline
        }}
        ref={textareaRef}
      />
      {/* Footer with attach and send, styled like thread composer */}
      <div className="bg-muted border-border dark:border-muted-foreground/15 relative flex items-start justify-between rounded-b-2xl border-x border-b p-2 cursor-text">
        <div className="flex max-w-full flex-wrap items-center gap-x-2 gap-y-2">
          <ComposerAddAttachment />
          {attachments.map((a, idx) => (
            <AttachmentChip
              key={`${idx}-${a.name}`}
              attachment={a}
              onRemove={handleRemoveAttachment}
            />
          ))}
        </div>

        {onStopAll ? (
          <StopButton
            onClick={onStopAll}
            aria-label="Stop all AI responses"
            title="Stop all AI responses"
            className="self-start"
          />
        ) : (
          <Button
            size="icon"
            onClick={onSubmit}
            aria-label="Send to all AIs"
            className="self-start"
            disabled={pendingAttachments}
          >
            <ArrowUpIcon className="size-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
