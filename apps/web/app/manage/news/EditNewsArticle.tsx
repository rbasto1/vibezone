"use client";

import { useMemo, type ChangeEvent } from "react";

import { Input } from "@/components/ui/input";
import { QueryAlert } from "@/components/ui/query-alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { trpc } from "@/lib/trpc/client";

export interface NewsDraft {
  title: Record<string, string>;
  body: Record<string, string>;
}

interface EditNewsArticleProps {
  draft: NewsDraft;
  id: string;
  onDraftChange: (
    field: keyof NewsDraft,
    locale: string,
    value: string
  ) => void;
}

const EditNewsArticle = ({
  draft,
  id,
  onDraftChange,
}: EditNewsArticleProps) => {
  const handleValueChange =
    (field: keyof NewsDraft, localeId: string) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onDraftChange(field, localeId, event.target.value);
    };

  const { data: localesData, error: localesError } =
    trpc.locales.list.useQuery();

  const localeIds = useMemo(() => {
    const availableLocales =
      localesData
        ?.filter((locale) => locale.available)
        .map((locale) => locale.id) ?? [];
    const base =
      availableLocales.length > 0
        ? availableLocales
        : Array.from(SUPPORTED_LOCALES);
    return Array.from(new Set([DEFAULT_LOCALE, ...base]));
  }, [localesData]);

  if (localesError) {
    return <QueryAlert error={localesError} />;
  }

  return (
    <Tabs defaultValue={DEFAULT_LOCALE}>
      <TabsList>
        {localeIds
          .toSorted((first, second) => first.localeCompare(second))
          .map((localeId) => (
            <TabsTrigger key={localeId} value={localeId}>
              {localeId}
            </TabsTrigger>
          ))}
      </TabsList>
      {localeIds.map((localeId) => {
        const titleId = `${id}-title-${localeId}`;
        const bodyId = `${id}-body-${localeId}`;

        return (
          <TabsContent key={localeId} value={localeId} className="space-y-2">
            <label htmlFor={titleId} className="text-sm font-medium">
              Title
            </label>
            <Input
              id={titleId}
              value={draft.title[localeId] ?? ""}
              onChange={handleValueChange("title", localeId)}
              maxLength={200}
            />
            <label htmlFor={bodyId} className="text-sm font-medium">
              Body
            </label>
            <textarea
              id={bodyId}
              value={draft.body[localeId] ?? ""}
              onChange={handleValueChange("body", localeId)}
              className="min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export { EditNewsArticle };
