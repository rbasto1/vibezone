import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TabsContent } from "@/components/ui/tabs";
import { siteName } from "@/lib/branding";
import { PreferencesDataExportModal } from "./data-export-modal";
import { PreferencesDataImportModal } from "./data-import-modal";
import { PreferencesDeleteChatsModal } from "./delete-chats-modal";

export const PreferencesDataTab = () => {
  const t = useTranslations("UserPreferences");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <TabsContent value="my-data" className="space-y-8">
        <p className="text-sm text-muted-foreground">
          {t("myData.description", { siteName })}
        </p>

        <Separator />

        <section className="space-y-3">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {t("myData.import.title")}
              </h3>
              <p className="text-sm text-muted-foreground sm:max-w-xl">
                {t("myData.import.instructions", { siteName })}
              </p>
            </div>
            <Button
              className="sm:ml-auto"
              onClick={() => setIsImportDialogOpen(true)}
            >
              {t("myData.import.button")}
            </Button>
          </header>
        </section>

        <Separator />

        <section className="space-y-3">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {t("myData.export.title")}
              </h3>
              <p className="text-sm text-muted-foreground sm:max-w-xl">
                {t("myData.export.instructions")}
              </p>
            </div>
            <Button
              className="sm:ml-auto"
              onClick={() => setIsExportDialogOpen(true)}
            >
              {t("myData.export.button")}
            </Button>
          </header>
        </section>

        <Separator />

        <section className="space-y-3">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">
                {t("myData.delete.title")}
              </h3>
              <p className="text-sm text-muted-foreground sm:max-w-xl">
                {t("myData.delete.description")}
              </p>
            </div>
            <Button
              variant="destructive"
              className="sm:ml-auto"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              {t("myData.delete.button")}
            </Button>
          </header>
        </section>
      </TabsContent>

      {isImportDialogOpen && (
        <PreferencesDataImportModal
          onClose={() => setIsImportDialogOpen(false)}
        />
      )}

      {isExportDialogOpen && (
        <PreferencesDataExportModal
          onClose={() => setIsExportDialogOpen(false)}
        />
      )}

      {isDeleteDialogOpen && (
        <PreferencesDeleteChatsModal
          onClose={() => setIsDeleteDialogOpen(false)}
        />
      )}
    </>
  );
};
