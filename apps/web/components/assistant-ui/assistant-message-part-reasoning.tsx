import type { FC, KeyboardEvent } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { z } from "zod";

import { cn } from "@/components/ui/utils";
import { safeParse } from "@/lib/json";
import { useMessagePartReasoning } from "@assistant-ui/react";

const ReasoningSchema = z.object({
  text: z.string(),
  type: z.string().optional(),
});

export const Reasoning: FC = () => {
  const reasoning = useMessagePartReasoning();
  const [isExpanded, setIsExpanded] = useState(false);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const contentId = useId();

  const parsedReasoning = useMemo(
    () => safeParse(reasoning.text, ReasoningSchema),
    [reasoning.text]
  );

  const text = parsedReasoning?.text ?? reasoning.text;
  const reasoningType = parsedReasoning?.type;
  const isRunning = reasoning.status.type === "running";
  const hasText = text.trim().length > 0;

  useEffect(() => {
    if (!streamRef.current || isExpanded || !hasText) return;

    const frame = requestAnimationFrame(() => {
      if (!streamRef.current) return;
      streamRef.current.scrollTop = streamRef.current.scrollHeight;
    });

    return () => cancelAnimationFrame(frame);
  }, [hasText, text, isExpanded]);

  const toggleExpanded = () => setIsExpanded((previous) => !previous);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleExpanded();
  };

  useEffect(() => {
    if (hasText) return;
    setIsExpanded((previous) => (previous ? false : previous));
  }, [hasText]);

  if (!hasText && !isRunning) return null;

  return (
    <div>
      <div className="flex items-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground/70">
        <span>Reasoning</span>
        {reasoningType ? (
          <span className="text-[9px] uppercase tracking-[0.32em] text-muted-foreground/50">
            {reasoningType}
          </span>
        ) : null}
        {isRunning ? (
          <span className="relative inline-flex size-2 shrink-0 items-center justify-center">
            <span className="absolute inline-flex size-full rounded-full bg-muted-foreground/30 opacity-70 animate-ping" />
            <span className="relative inline-flex size-1.5 rounded-full bg-muted-foreground/70" />
          </span>
        ) : null}
      </div>

      <div
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className={cn(
          "relative rounded-lg border border-border/40 bg-muted/40 p-3 text-left transition-[background-color,border-color,box-shadow]",
          isExpanded
            ? "cursor-auto"
            : "cursor-pointer hover:border-border/60 hover:bg-muted/50 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-ring/40"
        )}
        onClick={isExpanded ? undefined : toggleExpanded}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={isExpanded ? -1 : 0}
      >
        <div
          id={contentId}
          ref={streamRef}
          className={cn(
            "overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground/80 transition-[max-height,mask-image,-webkit-mask-image]",
            // hidden scrollbars
            "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
            isExpanded
              ? "max-h-[32rem] [mask-image:none] [-webkit-mask-image:none]"
              : "max-h-12 pr-1 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.95)_65%,rgba(0,0,0,0))] [-webkit-mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.95)_65%,rgba(0,0,0,0))]"
          )}
        >
          {hasText ? text : "..."}
        </div>

        {isExpanded && (
          <div
            className="mt-2 inline-flex cursor-pointer select-none text-[10px] uppercase tracking-[0.28em] text-muted-foreground/60 transition-colors hover:text-muted-foreground/80 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-ring/40"
            onClick={toggleExpanded}
            onKeyDown={handleKeyDown}
            aria-controls={contentId}
            role="button"
            tabIndex={0}
          >
            Collapse reasoning
          </div>
        )}
      </div>
    </div>
  );
};
