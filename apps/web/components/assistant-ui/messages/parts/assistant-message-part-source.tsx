import { ExternalLink } from "lucide-react";
import type { FC } from "react";
import { useMemo } from "react";

import { cn } from "@/components/ui/utils";
import { useMessagePartSource } from "@assistant-ui/react";

const getDomain = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

export const Source: FC = () => {
  const sourcePart = useMessagePartSource();

  const domain = useMemo(() => getDomain(sourcePart.url), [sourcePart.url]);
  const label = sourcePart.title?.trim() || sourcePart.url;

  return (
    <div className="aui-assistant-source mt-3 inline-flex flex-col gap-1.5 rounded-lg border border-border/40 bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
      <a
        href={sourcePart.url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          "group inline-flex items-center gap-2 text-foreground/80 transition-colors hover:text-foreground"
        )}
      >
        <ExternalLink className="size-4 text-muted-foreground/80 transition-colors group-hover:text-foreground/90" />
        <span className="truncate font-medium">{label}</span>
      </a>
      {domain ? (
        <span className="text-xs uppercase tracking-[0.28em] text-muted-foreground/70">
          {domain}
        </span>
      ) : null}
    </div>
  );
};
