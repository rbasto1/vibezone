"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useState } from "react";

import { useTranslations } from "next-intl";
import { Button } from "../../ui/button";

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
}) => {
  const t = useTranslations("ToolFallback");
  const [isCollapsed, setIsCollapsed] = useState(true);
  const toggleLabel = isCollapsed ? t("showDetails") : t("hideDetails");
  const argsLabel = t("argumentsHeading");
  const resultLabel = t("resultHeading");
  const usedToolPrefix = t("usedToolPrefix");
  return (
    <div className="mb-4 flex w-full flex-col gap-3 rounded-lg border py-3">
      <div className="flex items-center gap-2 px-4">
        <CheckIcon className="size-4" />
        <p className="">
          {usedToolPrefix} <b>{toolName}</b>
        </p>
        <div className="flex-grow" />
        <Button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </div>
      {!isCollapsed && (
        <div className="flex flex-col gap-2 border-t pt-2">
          <div className="px-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {argsLabel}
            </p>
            <pre className="whitespace-pre-wrap">{argsText}</pre>
          </div>
          {result !== undefined && (
            <div className="border-t border-dashed px-4 pt-2">
              <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                {resultLabel}
              </p>
              <pre className="whitespace-pre-wrap">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
