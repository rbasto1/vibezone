"use client";

import type { SyntaxHighlighterProps as AUIProps } from "@assistant-ui/react-markdown";
import flourite from "flourite";
import type { FC } from "react";
import ShikiHighlighter, { type ShikiHighlighterProps } from "react-shiki";
import { bundledLanguagesInfo } from "shiki";

import { cn } from "@/components/ui/utils";

const BUNDLED_LANGUAGE_IDS = new Set(
  bundledLanguagesInfo.flatMap(({ id, aliases }) => {
    const normalizedAliases =
      aliases?.map((alias) => alias.toLowerCase()) ?? [];
    return [id.toLowerCase(), ...normalizedAliases];
  })
);

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
  langAlias,
  ...props
}) => {
  const detectedLanguage =
    !language || language === "unknown"
      ? flourite(code, { shiki: true }).language
      : language;

  const resolvedLanguage =
    detectedLanguage === "unknown" ? "text" : detectedLanguage;

  // All this that follows is to handle languages that are not bundled, and at least render them as
  // plaintext instead of nothing
  const normalizedLangId =
    typeof resolvedLanguage === "string"
      ? resolvedLanguage.toLowerCase()
      : undefined;

  const hasBundledLanguage = normalizedLangId
    ? BUNDLED_LANGUAGE_IDS.has(normalizedLangId)
    : false;

  const hasCustomAlias =
    typeof resolvedLanguage === "string"
      ? Boolean(langAlias?.[resolvedLanguage])
      : false;

  const shikiLanguage =
    typeof resolvedLanguage === "string" &&
    !hasBundledLanguage &&
    !hasCustomAlias
      ? "plaintext"
      : resolvedLanguage;

  const mergedLangAlias =
    typeof resolvedLanguage === "string" &&
    !hasBundledLanguage &&
    !hasCustomAlias
      ? { ...(langAlias ?? {}), [resolvedLanguage]: "plaintext" }
      : langAlias;

  return (
    <ShikiHighlighter
      {...props}
      language={shikiLanguage}
      langAlias={mergedLangAlias}
      theme={theme}
      addDefaultStyles={addDefaultStyles}
      showLanguage={showLanguage}
      defaultColor="light-dark()"
      className={cn(
        "[&_pre]:overflow-x-auto [&_pre]:rounded-b-lg [&_pre]:!bg-muted/75 [&_pre]:p-2",
        className
      )}
    >
      {code.trim()}
    </ShikiHighlighter>
  );
};

SyntaxHighlighter.displayName = "SyntaxHighlighter";
