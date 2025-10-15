"use client";

import type { NextPage } from "next";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AdminHeader } from "@/components/ui/admin-header";
import { Button } from "@/components/ui/button";
import { QueryAlert } from "@/components/ui/query-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { DEFAULT_LOCALE } from "@/lib/i18n/locales";
import { trpc } from "@/lib/trpc/client";

import { cn } from "@/components/ui/utils";
import { EditNewsArticle, type NewsDraft } from "./EditNewsArticle";

const NewsManagePageClient: NextPage = () => {
  const listInput = useMemo(() => ({ includeDeleted: true }), []);
  const { data, error, isLoading, refetch, isFetching } =
    trpc.news.list.useQuery(listInput);

  const utils = trpc.useUtils();

  const createMutation = trpc.news.create.useMutation();
  const updateMutation = trpc.news.update.useMutation();
  const deleteMutation = trpc.news.delete.useMutation();
  const restoreMutation = trpc.news.restore.useMutation();

  const [newDraft, setNewDraft] = useState<NewsDraft>(() => ensureDraft());
  const [drafts, setDrafts] = useState<Record<string, NewsDraft>>({});
  const [selectedArticleId, setSelectedArticleId] = useState<string>();

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

  useEffect(() => {
    if (!data || !selectedArticleId) return;
    if (!data.some((item) => item.id === selectedArticleId)) {
      setSelectedArticleId(undefined);
    }
  }, [data, selectedArticleId]);

  const newsItems = data ?? [];

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
    const existingItem = newsItems.find((entry) => entry.id === id);
    if (!drafts[id] && !existingItem) {
      toast.error("Unable to find news item to update");
      return;
    }
    const ensuredDraft = ensureDraft(
      drafts[id] ??
        (existingItem
          ? {
              title: { ...existingItem.title },
              body: { ...existingItem.body },
            }
          : undefined)
    );
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

  const handleSelect = (id: string) => {
    setSelectedArticleId((previous) => (previous === id ? undefined : id));
  };

  const selectedItem = selectedArticleId
    ? (newsItems.find((item) => item.id === selectedArticleId) ?? null)
    : null;

  const selectedDraft =
    selectedItem === null
      ? null
      : ensureDraft(
          drafts[selectedItem.id] ?? {
            title: { ...selectedItem.title },
            body: { ...selectedItem.body },
          }
        );

  const selectedIsUnchanged =
    selectedItem === null ||
    selectedDraft === null ||
    (translationsMatch(selectedDraft.title, selectedItem.title) &&
      translationsMatch(selectedDraft.body, selectedItem.body));

  const selectedIsArchived = selectedItem?.deletedAt !== null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <AdminHeader
        title="News"
        description="Manage the announcements displayed in the What's New modal."
        onRefetch={refetch}
        isFetching={isFetching}
      />

      <QueryAlert error={error} />

      <section className="space-y-4 rounded-lg border p-4">
        <div>
          <h2 className="text-lg font-semibold">Create news</h2>
          <p className="text-sm text-muted-foreground">
            Publish updates that will appear to users visiting the site.
          </p>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <EditNewsArticle
            draft={newDraft}
            id="new"
            onDraftChange={(field, localeId, value) =>
              setNewDraft((previous) =>
                updateDraftField(previous, field, localeId, value)
              )
            }
          />
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

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : newsItems.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          No news entries yet. Create one above to get started.
        </div>
      ) : (
        <div className="space-y-4">
          <section className="space-y-3 rounded-lg border p-4">
            <div>
              <h2 className="text-lg font-semibold">Existing news</h2>
              <p className="text-sm text-muted-foreground">
                Select an article to review or update translations.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {newsItems.map((item) => {
                const defaultTitle =
                  item.title[DEFAULT_LOCALE]?.trim() || "(untitled)";
                const defaultBody = item.body[DEFAULT_LOCALE]?.trim() ?? "";
                const preview =
                  defaultBody.length > 0
                    ? `${defaultBody.slice(0, 120)}${
                        defaultBody.length > 120 ? "..." : ""
                      }`
                    : "No body content in default locale.";
                const isSelected = selectedArticleId === item.id;
                const isArchived = item.deletedAt !== null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.id)}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isSelected ? "border-ring bg-muted" : "hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{defaultTitle}</span>
                      {isArchived && (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {preview}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {selectedItem && selectedDraft && (
            <article className="space-y-4 rounded-lg border p-4 shadow-xs">
              <header className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    Created {formatDate(selectedItem.createdAt)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Updated {formatDate(selectedItem.updatedAt)}
                  </span>
                </div>
                {selectedIsArchived && (
                  <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                    Archived
                  </span>
                )}
              </header>
              <EditNewsArticle
                draft={selectedDraft}
                id={`edit-${selectedItem.id}`}
                onDraftChange={(field, localeId, value) =>
                  handleDraftChange(selectedItem.id, field, localeId, value)
                }
              />
              <footer className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => handleSave(selectedItem.id)}
                  loading={updateMutation.isPending}
                  disabled={
                    updateMutation.isPending ||
                    selectedIsUnchanged ||
                    !selectedDraft.title[DEFAULT_LOCALE]?.trim() ||
                    !selectedDraft.body[DEFAULT_LOCALE]?.trim()
                  }
                >
                  Save changes
                </Button>
                {selectedIsArchived ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRestore(selectedItem.id)}
                    loading={restoreMutation.isPending}
                  >
                    Restore
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleDelete(selectedItem.id)}
                    loading={deleteMutation.isPending}
                  >
                    Archive
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedArticleId(undefined)}
                >
                  Close
                </Button>
              </footer>
            </article>
          )}
        </div>
      )}
    </div>
  );
};

export default NewsManagePageClient;

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
