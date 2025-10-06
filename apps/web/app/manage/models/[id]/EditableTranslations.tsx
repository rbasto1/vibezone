"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

interface Translation {
  localeId: string;
  localeName: string;
  description: string | null;
}

interface EditableTranslationsProps {
  modelId: string;
  translations: Translation[];
}

export default function EditableTranslations({
  modelId,
  translations,
}: EditableTranslationsProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const saveMutation = trpc.models.saveTranslation.useMutation();

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

  return (
    <Tabs defaultValue={translations[0]?.localeId} className="space-y-3">
      <TabsList className="w-full">
        {translations.map((translation) => (
          <TabsTrigger key={translation.localeId} value={translation.localeId}>
            {translation.localeName}
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
                <div className="rounded-sm border border-muted/40 bg-muted/20 p-3 text-sm leading-relaxed text-muted-foreground [&_a]:underline">
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
