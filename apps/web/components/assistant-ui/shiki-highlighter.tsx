"use client";

import type { SyntaxHighlighterProps as AUIProps } from "@assistant-ui/react-markdown";
import flourite from "flourite";
import type { FC } from "react";
import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki/web";

import { cn } from "@/components/ui/utils";

type BaseHighlighterProps = Omit<ShikiHighlighterProps, "children" | "theme"> &
  Pick<AUIProps, "node" | "components" | "language" | "code">;

export interface SyntaxHighlighterProps extends BaseHighlighterProps {
  theme?: ShikiHighlighterProps["theme"];
}

export const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({
  code,
  language,
  theme = { dark: "kanagawa-wave", light: "kanagawa-lotus" },
  className,
  addDefaultStyles = false,
  showLanguage = false,
  node: _node,
  components: _components,
  ...props
}) => {
  const detectedLanguage =
    !language || language === "unknown"
      ? flourite(code, { shiki: true }).language
      : language;

  const resolvedLanguage =
    detectedLanguage === "unknown" ? "text" : detectedLanguage;

  return (
    <ShikiHighlighter
      {...props}
      language={resolvedLanguage}
      theme={theme}
      addDefaultStyles={addDefaultStyles}
      showLanguage={showLanguage}
      defaultColor="light-dark()"
      className={cn(
        "aui-shiki-base [&_pre]:overflow-x-auto [&_pre]:rounded-b-lg [&_pre]:!bg-muted/75 [&_pre]:p-4",
        className
      )}
    >
      {code.trim()}
    </ShikiHighlighter>
  );
};

SyntaxHighlighter.displayName = "SyntaxHighlighter";
