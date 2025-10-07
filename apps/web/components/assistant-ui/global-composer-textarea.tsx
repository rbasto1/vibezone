"use client";

import type { KeyboardEvent } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { useStateSessionStorage } from "@/hooks/use-session-storage";

export type GlobalComposerTextareaHandle = {
  focus: () => void;
  submit: () => Promise<boolean>;
};

type GlobalComposerTextareaProps = {
  placeholder: string;
  onSubmit: (value: string) => Promise<boolean>;
};

export const GlobalComposerTextarea = forwardRef<
  GlobalComposerTextareaHandle,
  GlobalComposerTextareaProps
>(({ placeholder, onSubmit }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [prompt, setPrompt] = useStateSessionStorage("prompt");

  const handleSubmit = useCallback(async (): Promise<boolean> => {
    const success = await onSubmit(prompt);
    if (success) {
      setPrompt("");
    }
    return success;
  }, [onSubmit, prompt, setPrompt]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        textareaRef.current?.focus();
      },
      submit: handleSubmit,
    }),
    [handleSubmit]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <textarea
      placeholder={placeholder}
      name="global-composer"
      autoFocus
      className="bg-muted border-border dark:border-muted-foreground/15 focus:outline-primary placeholder:text-muted-foreground max-h-[calc(50dvh)] min-h-16 w-full resize-none rounded-t-2xl border-x border-t px-4 pt-2 pb-3 text-base outline-none"
      rows={1}
      value={prompt}
      onChange={(event) => setPrompt(event.target.value)}
      onKeyDown={handleKeyDown}
      ref={textareaRef}
    />
  );
});

GlobalComposerTextarea.displayName = "GlobalComposerTextarea";
