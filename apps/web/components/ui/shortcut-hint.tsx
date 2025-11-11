"use client";

import { ArrowBigUpIcon, CommandIcon } from "lucide-react";
import type { FC, ReactNode } from "react";

import { useIsMac } from "@/hooks/use-is-mac";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "./utils";

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type ShortcutToken = "cmdOrCtrl" | "shift" | string;

interface ShortcutHintProps {
  combo: ShortcutToken[];
  className?: string;
}

export const ShortcutHint: FC<ShortcutHintProps> = ({ combo, className }) => {
  const isMobile = useIsMobile();
  const isMac = useIsMac();

  if (isMobile || !combo.length) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs text-muted-foreground",
        className
      )}
      aria-hidden="true"
    >
      {combo.map((token, index) => (
        <span
          key={`${token}-${index}`}
          className="inline-flex min-w-[1.25rem] items-center justify-center rounded border border-border bg-muted px-1 py-0.5 text-[10px] font-semibold uppercase leading-none h-5"
        >
          {renderToken(token, isMac)}
        </span>
      ))}
    </span>
  );
};

const renderToken = (token: ShortcutToken, isMac: boolean): ReactNode => {
  if (token === "cmdOrCtrl") {
    return isMac ? (
      <CommandIcon className="h-3 w-3" />
    ) : (
      <span className="normal-case">Ctrl</span>
    );
  }
  if (token === "shift") {
    return <ArrowBigUpIcon className="size-3" />;
  }
  return token.length === 1 ? token.toUpperCase() : token;
};
