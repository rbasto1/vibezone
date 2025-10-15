"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { NextPage } from "next";
import { toast } from "sonner";

import { AdminHeader } from "@/components/ui/admin-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueryAlert } from "@/components/ui/query-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import { trpc } from "@/lib/trpc/client";

interface NewsDraft {
  title: string;
  body: string;
}

const NewsManagePageClient: NextPage = () => {
  const listInput = useMemo(() => ({ includeDeleted: true }), []);
  const {
    data,
    error,
    isLoading,
    refetch,
    isFetching,
  } = trpc.news.list.useQuery(listInput);
  const utils = trpc.useUtils();

  const createMutation = trpc.news.create.useMutation();
  const updateMutation = trpc.news.update.useMutation();
  const deleteMutation = trpc.news.delete.useMutation();
  const restoreMutation = trpc.news.restore.useMutation();

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [drafts, setDrafts] = useState<Record<string, NewsDraft>>({});

  useEffect(() => {
    if (!data) return;
    setDrafts(
      data.reduce<Record<string, NewsDraft>>((accumulator, item) => {
        accumulator[item.id] = { title: item.title, body: item.body };
        return accumulator;
      }, {})
    );
  }, [data]);

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
    const title = newTitle.trim();
    const body = newBody.trim();
    if (!title || !body) {
      toast.error("Title and body are required");
      return;
    }
    await createMutation
      .mutateAsync({ title, body })
      .then(async () => {
        setNewTitle("");
        setNewBody("");
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
    value: string
  ) => {
    setDrafts((previous) => ({
      ...previous,
      [id]: {
        ...(previous[id] ?? { title: "", body: "" }),
        [field]: value,
      },
    }));
  };

  const handleSave = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    const title = draft.title.trim();
    const body = draft.body.trim();
    if (!title || !body) {
      toast.error("Title and body cannot be empty");
      return;
    }
    await updateMutation
      .mutateAsync({ id, title, body })
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

      <QueryAlert error={error} />

      <section className="space-y-4 rounded-lg border p-4">
        <div>
          <h2 className="text-lg font-semibold">Create news</h2>
          <p className="text-sm text-muted-foreground">
            Publish updates that will appear to users visiting the site.
          </p>
        </div>
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            placeholder="Short headline"
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
            maxLength={200}
          />
          <textarea
            value={newBody}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setNewBody(event.target.value)
            }
            placeholder="Describe the update..."
            className="min-h-[150px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={createMutation.isPending}
              disabled={!newTitle.trim() || !newBody.trim()}
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
          {newsItems.map((item) => {
            const draft = drafts[item.id] ?? {
              title: item.title,
              body: item.body,
            };
            const isArchived = item.deletedAt !== null;
            return (
              <article
                key={item.id}
                className="space-y-3 rounded-lg border p-4 shadow-xs"
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
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    handleDraftChange(item.id, "title", event.target.value)
                  }
                  placeholder="Title"
                  maxLength={200}
                  aria-label="News title"
                />
                <textarea
                  value={draft.body}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    handleDraftChange(item.id, "body", event.target.value)
                  }
                  className="min-h-[140px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                  aria-label="News body"
                />
                <footer className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={() => handleSave(item.id)}
                    loading={updateMutation.isPending}
                    disabled={
                      updateMutation.isPending ||
                      (draft.title.trim() === item.title &&
                        draft.body.trim() === item.body)
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
