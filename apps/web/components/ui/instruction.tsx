import type { FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "./utils";

interface InstructionProps {
  content: string;
  className?: string;
}

export const Instruction: FC<InstructionProps> = ({ content, className }) => {
  return (
    <div
      className={cn(
        "overflow-auto rounded-sm border border-muted/40 bg-muted/20 p-2 text-sm text-muted-foreground [&_a]:underline w-full whitespace-pre-line",
        className
      )}
    >
      <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};
