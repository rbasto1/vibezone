"use client";

import type { NextPage } from "next";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { AdminHeader } from "@/components/ui/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryAlert } from "@/components/ui/query-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/format";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { trpc } from "@/lib/trpc/client";

interface NewsDraft {
  title: Record<string, string>;
  body: Record<string, string>;
}

const ensureDraft = (draft?: Partial<NewsDraft>): NewsDraft => ({
  title: { [DEFAULT_LOCALE]: "", ...(draft?.title ?? {}) },
  body: { [DEFAULT_LOCALE]: "", ...(draft?.body ?? {}) },
});

const sanitizeTranslations = (translations: Record<string, string>) => {
  const result: Record<string, string> = {};
  Object.entries(translations).forEach(([locale, value]) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return;
    }
    result[locale] = trimmedValue;
  });
  return result;
};

const normalizeForCompare = (translations: Record<string, string>) =>
  Object.entries(translations)
    .filter(([, value]) => value.trim().length > 0)
    .map(([locale, value]) => [locale, value.trim()] as const)
    .sort(([localeA], [localeB]) => localeA.localeCompare(localeB));

const translationsMatch = (
  first: Record<string, string>,
  second: Record<string, string>
) => {
  const normalizedFirst = normalizeForCompare(first);
  const normalizedSecond = normalizeForCompare(second);
  if (normalizedFirst.length !== normalizedSecond.length) {
    return false;
  }
  return normalizedFirst.every(([locale, value], index) => {
    if (!normalizedSecond[index]) throw new Error("Assert: Mismatched length");
    const [otherLocale, otherValue] = normalizedSecond[index];
    return locale === otherLocale && value === otherValue;
  });
};

const updateDraftField = (
  draft: NewsDraft,
  field: keyof NewsDraft,
  locale: string,
  value: string
): NewsDraft => ({
  ...draft,
  [field]: {
    ...draft[field],
    [locale]: value,
  },
});

const NewsManagePageClient: NextPage = () => {
  const listInput = useMemo(() => ({ includeDeleted: true }), []);
  const { data, error, isLoading, refetch, isFetching } =
    trpc.news.list.useQuery(listInput);

  const {
    data: localesData,
    error: localesError,
    isLoading: localesLoading,
  } = trpc.locales.list.useQuery();

  const utils = trpc.useUtils();

  const createMutation = trpc.news.create.useMutation();
  const updateMutation = trpc.news.update.useMutation();
  const deleteMutation = trpc.news.delete.useMutation();
  const restoreMutation = trpc.news.restore.useMutation();

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

  const localeLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    localesData?.forEach((locale) => {
      map.set(locale.id, locale.name);
    });
    return map;
  }, [localesData]);

  const [newDraft, setNewDraft] = useState<NewsDraft>(() => ensureDraft());
  const [drafts, setDrafts] = useState<Record<string, NewsDraft>>({});

  useEffect(() => {
    if (!data) return;
    setDrafts(
      data.reduce<Record<string, NewsDraft>>((accumulator, item) => {
        accumulator[item.id] = ensureDraft({
          title: { ...item.title },
          body: { ...item.body },
        });
        return accumulator;
      }, {})
    );
  }, [data]);

  const newsItems = data ?? [];
  const isInitialLoading = isLoading || localesLoading;

  const invalidateList = async () => {
    await utils.news.list.invalidate(listInput).catch((mutationError) => {
      console.error("Failed to refresh news list:", mutationError);
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to refresh news list"
      );
    });
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const titlePayload = sanitizeTranslations(newDraft.title);
    const bodyPayload = sanitizeTranslations(newDraft.body);
    if (!titlePayload[DEFAULT_LOCALE] || !bodyPayload[DEFAULT_LOCALE]) {
      toast.error("Default locale title and body are required");
      return;
    }
    await createMutation
      .mutateAsync({ title: titlePayload, body: bodyPayload })
      .then(async () => {
        setNewDraft(ensureDraft());
        toast.success("News item created");
        await invalidateList();
      })
      .catch((mutationError) => {
        console.error("Failed to create news:", mutationError);
        toast.error(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to create news item"
        );
      });
  };

  const handleDraftChange = (
    id: string,
    field: keyof NewsDraft,
    locale: string,
    value: string
  ) => {
    setDrafts((previous) => {
      const existing = ensureDraft(previous[id]);
      return {
        ...previous,
        [id]: updateDraftField(existing, field, locale, value),
      };
    });
  };

  const handleSave = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const ensuredDraft = ensureDraft(draft);
    const titlePayload = sanitizeTranslations(ensuredDraft.title);
    const bodyPayload = sanitizeTranslations(ensuredDraft.body);
    if (!titlePayload[DEFAULT_LOCALE] || !bodyPayload[DEFAULT_LOCALE]) {
      toast.error("Default locale translations cannot be empty");
      return;
    }
    await updateMutation
      .mutateAsync({ id, title: titlePayload, body: bodyPayload })
      .then(async () => {
        toast.success("News item updated");
        await invalidateList();
      })
      .catch((mutationError) => {
        console.error("Failed to update news:", mutationError);
        toast.error(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to update news item"
        );
      });
  };

  const handleDelete = async (id: string) => {
    await deleteMutation
      .mutateAsync({ id })
      .then(async () => {
        toast.success("News item archived");
        await invalidateList();
      })
      .catch((mutationError) => {
        console.error("Failed to archive news:", mutationError);
        toast.error(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to archive news item"
        );
      });
  };

  const handleRestore = async (id: string) => {
    await restoreMutation
      .mutateAsync({ id })
      .then(async () => {
        toast.success("News item restored");
        await invalidateList();
      })
      .catch((mutationError) => {
        console.error("Failed to restore news:", mutationError);
        toast.error(
          mutationError instanceof Error
            ? mutationError.message
            : "Failed to restore news item"
        );
      });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <AdminHeader
        title="News"
        description="Manage the announcements displayed in the What's New modal."
        onRefetch={refetch}
        isFetching={isFetching}
      />

      <QueryAlert error={error ?? localesError} />

      <section className="space-y-4 rounded-lg border p-4">
        <div>
          <h2 className="text-lg font-semibold">Create news</h2>
          <p className="text-sm text-muted-foreground">
            Publish updates that will appear to users visiting the site.
          </p>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid gap-4">
            <Tabs defaultValue="en">
              <TabsList>
                {localeIds.toSorted().map((localeId) => (
                  <TabsTrigger key={localeId} value={localeId}>
                    {localeId}
                  </TabsTrigger>
                ))}
              </TabsList>
              {localeIds.map((localeId) => {
                const localeLabel = localeLabelMap.get(localeId) ?? localeId;
                const isDefaultLocale = localeId === DEFAULT_LOCALE;
                const titleId = `new-title-${localeId}`;
                const bodyId = `new-body-${localeId}`;
                return (
                  <TabsContent
                    key={`create-${localeId}`}
                    value={localeId}
                    className="space-y-2"
                  >
                    <label htmlFor={titleId} className="text-sm font-medium">
                      Title ({localeLabel} · {localeId})
                      {isDefaultLocale ? " *" : ""}
                    </label>
                    <Input
                      id={titleId}
                      placeholder={`Short headline (${localeId})`}
                      value={newDraft.title[localeId] ?? ""}
                      onChange={(event) =>
                        setNewDraft((previous) =>
                          updateDraftField(
                            previous,
                            "title",
                            localeId,
                            event.target.value
                          )
                        )
                      }
                      maxLength={200}
                    />
                    <label htmlFor={bodyId} className="text-sm font-medium">
                      Body ({localeLabel} · {localeId})
                      {isDefaultLocale ? " *" : ""}
                    </label>
                    <textarea
                      id={bodyId}
                      value={newDraft.body[localeId] ?? ""}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                        setNewDraft((previous) =>
                          updateDraftField(
                            previous,
                            "body",
                            localeId,
                            event.target.value
                          )
                        )
                      }
                      placeholder={`Describe the update (${localeId})...`}
                      className="min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={createMutation.isPending}
              disabled={
                createMutation.isPending ||
                !newDraft.title[DEFAULT_LOCALE]?.trim() ||
                !newDraft.body[DEFAULT_LOCALE]?.trim()
              }
            >
              Publish
            </Button>
          </div>
        </form>
      </section>

      {isInitialLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : newsItems.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No news entries yet. Create one above to get started.
        </div>
      ) : (
        <div className="space-y-4">
          {newsItems.map((item) => {
            const storedDraft = drafts[item.id];
            const draft =
              storedDraft ??
              ensureDraft({
                title: { ...item.title },
                body: { ...item.body },
              });
            const isArchived = item.deletedAt !== null;
            const isUnchanged =
              translationsMatch(draft.title, item.title) &&
              translationsMatch(draft.body, item.body);
            return (
              <article
                key={item.id}
                className="space-y-4 rounded-lg border p-4 shadow-xs"
              >
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      Created {formatDate(item.createdAt)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDate(item.updatedAt)}
                    </span>
                  </div>
                  {isArchived && (
                    <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                      Archived
                    </span>
                  )}
                </header>
                <div className="grid gap-4">
                  {localeIds.map((localeId) => {
                    const localeLabel =
                      localeLabelMap.get(localeId) ?? localeId;
                    const isDefaultLocale = localeId === DEFAULT_LOCALE;
                    const titleId = `${item.id}-title-${localeId}`;
                    const bodyId = `${item.id}-body-${localeId}`;
                    return (
                      <div key={`${item.id}-${localeId}`} className="space-y-2">
                        <label
                          htmlFor={titleId}
                          className="text-sm font-medium"
                        >
                          Title ({localeLabel} · {localeId})
                          {isDefaultLocale ? " *" : ""}
                        </label>
                        <Input
                          id={titleId}
                          value={draft.title[localeId] ?? ""}
                          onChange={(event) =>
                            handleDraftChange(
                              item.id,
                              "title",
                              localeId,
                              event.target.value
                            )
                          }
                          placeholder={`Title (${localeId})`}
                          maxLength={200}
                        />
                        <label htmlFor={bodyId} className="text-sm font-medium">
                          Body ({localeLabel} · {localeId})
                          {isDefaultLocale ? " *" : ""}
                        </label>
                        <textarea
                          id={bodyId}
                          value={draft.body[localeId] ?? ""}
                          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                            handleDraftChange(
                              item.id,
                              "body",
                              localeId,
                              event.target.value
                            )
                          }
                          className="min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                          placeholder={`Body (${localeId})`}
                        />
                      </div>
                    );
                  })}
                </div>
                <footer className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => handleSave(item.id)}
                    loading={updateMutation.isPending}
                    disabled={
                      updateMutation.isPending ||
                      isUnchanged ||
                      !draft.title[DEFAULT_LOCALE]?.trim() ||
                      !draft.body[DEFAULT_LOCALE]?.trim()
                    }
                  >
                    Save changes
                  </Button>
                  {isArchived ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRestore(item.id)}
                      loading={restoreMutation.isPending}
                    >
                      Restore
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                      loading={deleteMutation.isPending}
                    >
                      Archive
                    </Button>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NewsManagePageClient;
