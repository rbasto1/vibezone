"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getModelOriginalLocale } from "@/lib/locale";
import { trpc } from "@/lib/trpc/client";
import type { AdminDescriptionsOutput } from "@/lib/trpc/server/server";
import { CloudAlertIcon, EraserIcon, PencilLineIcon } from "lucide-react";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

interface EditableTranslationsProps {
  modelId: string;
  modelUpdatedAt: Date;
  translations: AdminDescriptionsOutput["translations"];
  originalDescription: string;
}

export default function EditableTranslations({
  modelId,
  modelUpdatedAt,
  translations,
  originalDescription,
}: EditableTranslationsProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const utils = trpc.useUtils();
  const saveMutation = trpc.models.saveTranslation.useMutation({
    onSuccess: (data, variables) => {
      utils.models.adminDescriptions.setData(
        { modelId: variables.modelId },
        (prev) =>
          !prev
            ? undefined
            : {
                ...prev,
                translations: prev?.translations.map((t) =>
                  t.localeId === variables.localeId ? { ...t, ...data.item } : t
                ),
              }
      );
    },
    onError: (error) => {
      console.error("Failed to save translation:", error);
      toast.error(`Failed to save translation: ${error.message}`);
    },
  });

  const handleEdit = (localeId: string, description: string | null) => {
    setEditing(localeId);
    setEditValue(description || "");
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      await saveMutation.mutateAsync({
        modelId,
        localeId: editing,
        description: editValue,
      });
      setEditing(null);
    } catch (error) {
      console.error("Failed to save translation:", error);
      if (error instanceof Error) {
        toast.error(`Failed to save translation: ${error.message}`);
      }
    }
  };

  const handleCancel = () => {
    setEditing(null);
    setEditValue("");
  };

  if (!translations.length) {
    return (
      <div className="text-sm text-muted-foreground">
        No locale translations available.
      </div>
    );
  }

  const originalLocale = getModelOriginalLocale(modelId);
  const defaultLocale = translations.some((t) => t.localeId === originalLocale)
    ? originalLocale
    : translations[0]?.localeId;
  const sortedTranslations = translations.toSorted((a, b) =>
    a.localeId === originalLocale ? -1 : a.localeId.localeCompare(b.localeId)
  );

  return (
    <Tabs defaultValue={defaultLocale} className="space-y-3">
      <TabsList className="gap-2">
        {sortedTranslations.map((translation) => (
          <TabsTrigger key={translation.localeId} value={translation.localeId}>
            {translation.localeName}
            {translation.manuallyEditedAt ? (
              <>
                <PencilLineIcon className="h-4 w-4 text-orange-500" />
                {translation.manuallyEditedAt < modelUpdatedAt && (
                  <CloudAlertIcon className="h-4 w-4 text-red-500" />
                )}
              </>
            ) : (
              originalLocale === translation.localeId &&
              translation.description !== originalDescription && (
                <EraserIcon className="h-4 w-4 text-blue-500" />
              )
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {translations.map((translation) => (
        <TabsContent key={translation.localeId} value={translation.localeId}>
          {editing === translation.localeId ? (
            <div className="space-y-3">
              <textarea
                value={editValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditValue(e.target.value)
                }
                className="min-h-[200px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] font-mono"
                placeholder="Enter translation..."
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  size="sm"
                >
                  {saveMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {translation.description ? (
                <div
                  className="rounded-sm border border-muted/40 bg-muted/20 p-3 text-sm leading-relaxed text-muted-foreground [&_a]:underline cursor-pointer"
                  onClick={() =>
                    handleEdit(translation.localeId, translation.description)
                  }
                >
                  <ReactMarkdown skipHtml remarkPlugins={[remarkGfm]}>
                    {translation.description}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="rounded-sm border border-dashed border-muted/60 bg-muted/10 p-3 text-sm text-muted-foreground">
                  No description provided for this locale.
                </div>
              )}
              <Button
                onClick={() =>
                  handleEdit(translation.localeId, translation.description)
                }
                variant="outline"
                size="sm"
              >
                Edit
              </Button>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
