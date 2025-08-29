"use client";
import { ArrowUpIcon, PlusIcon } from "lucide-react";
import React from "react";
import { Button } from "../ui/button";

export type GlobalComposerProps = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
};

export const GlobalComposer: React.FC<GlobalComposerProps> = ({
  value,
  onChange,
  onSubmit,
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't steal focus when clicking on actual buttons
    if (target.closest("button")) return;
    textareaRef.current?.focus();
  };

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
        <Button
          type="button"
          variant="ghost"
          className="hover:bg-foreground/15 dark:hover:bg-background/50 scale-115 p-3.5"
          onClick={() => console.warn("Attachment clicked - not implemented")}
          aria-label="Attach file"
        >
          <PlusIcon />
        </Button>

        <Button
          type="button"
          className="dark:border-muted-foreground/90 border-muted-foreground/60 hover:bg-primary/75 size-8 rounded-full border cursor-pointer"
          onClick={onSubmit}
          aria-label="Send to all panels"
        >
          <ArrowUpIcon className="size-5" />
        </Button>
      </div>
    </div>
  );
};
