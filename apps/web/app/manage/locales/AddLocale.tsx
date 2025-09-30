import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import type { FC } from "react";
import { useState } from "react";
import { toast } from "sonner";

export const AddLocale: FC = () => {
  const utils = trpc.useUtils();
  const create = trpc.locales.create.useMutation({
    onSuccess: async () => {
      await utils.locales.list.invalidate().catch(() => {
        toast.error("Failed to refresh locales list");
      });
    },
  });
  const [newLocaleId, setNewLocaleId] = useState("");
  const [newLocaleName, setNewLocaleName] = useState("");

  return (
    <div className="flex flex-col gap-2 max-w-xs mt-8">
      <h2 className="text-lg font-semibold">Add Locale</h2>
      <Input
        placeholder="Locale ID (e.g., en-US)"
        className="h-10 w-full"
        value={newLocaleId}
        onChange={(e) => setNewLocaleId(e.target.value)}
      />
      <Input
        placeholder="Locale Name (e.g., English)"
        className="h-10 w-full"
        value={newLocaleName}
        onChange={(e) => setNewLocaleName(e.target.value)}
      />
      <div>
        <Button
          onClick={async () => {
            if (!newLocaleId.trim() || !newLocaleName.trim()) {
              toast.error("Please enter both locale ID and name");
              return;
            }
            try {
              await create.mutateAsync({
                id: newLocaleId.trim(),
                name: newLocaleName.trim(),
                available: false,
              });
              setNewLocaleId("");
              setNewLocaleName("");
              toast.success(`Locale "${newLocaleName}" created`);
            } catch (error) {
              console.error("Failed to create locale:", error);
              if (error instanceof Error) {
                toast.error(`Failed to create locale: ${error.message}`);
              } else {
                toast.error("Failed to create locale");
              }
            }
          }}
          disabled={create.isPending}
        >
          Add Locale
        </Button>
      </div>
    </div>
  );
};
