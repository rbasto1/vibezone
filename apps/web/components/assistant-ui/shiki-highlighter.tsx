"use client";

import type { SyntaxHighlighterProps as AUIProps } from "@assistant-ui/react-markdown";
import type { FC } from "react";
import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki";

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
  const BASE_STYLES =
    "aui-shiki-base [&_pre]:overflow-x-auto [&_pre]:rounded-b-lg [&_pre]:!bg-muted/75 [&_pre]:p-4";

  return (
    <ShikiHighlighter
      {...props}
      language={language}
      theme={theme}
      addDefaultStyles={addDefaultStyles}
      showLanguage={showLanguage}
      defaultColor="light-dark()"
      className={cn(BASE_STYLES, className)}
    >
      {code.trim()}
    </ShikiHighlighter>
  );
};

SyntaxHighlighter.displayName = "SyntaxHighlighter";
