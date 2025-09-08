"use client";
import { ArrowUpIcon, PlusIcon } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";
import { StopButton } from "../ui/stop-button";

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
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't steal focus when clicking on actual buttons
    if (target.closest("button")) return;
    textareaRef.current?.focus();
  };

  const canAttach = false;

  return (
    <div
      className="bg-background relative flex w-full flex-col gap-0 pb-4 md:pb-6 cursor-text"
      onClick={handleContainerClick}
    >
      {/* Input box (top section) */}
      <textarea
        placeholder="Ask all of the AIs..."
        autoFocus
        className="bg-muted border-border dark:border-muted-foreground/15 focus:outline-primary placeholder:text-muted-foreground max-h-[calc(50dvh)] min-h-16 w-full resize-none rounded-t-2xl border-x border-t px-4 pt-2 pb-3 text-base outline-none"
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            onSubmit();
          }
          // Shift/Ctrl/Cmd+Enter falls through to add newline
        }}
        ref={textareaRef}
      />
      {/* Footer with attach and send, styled like thread composer */}
      <div className="bg-muted border-border dark:border-muted-foreground/15 relative flex items-center justify-between rounded-b-2xl border-x border-b p-2 cursor-text">
        {canAttach ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => console.warn("Attachment clicked - not implemented")}
            aria-label="Attach file"
          >
            <PlusIcon />
          </Button>
        ) : (
          <div />
        )}

        {onStopAll ? (
          <StopButton
            onClick={onStopAll}
            aria-label="Stop all AI responses"
            title="Stop all AI responses"
          />
        ) : (
          <Button size="icon" onClick={onSubmit} aria-label="Send to all AIs">
            <ArrowUpIcon className="size-5" />
          </Button>
        )}
      </div>
    </div>
  );
};
