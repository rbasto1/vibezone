import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import { siteName } from "@/lib/branding";
import { PreferencesDataExportModal } from "./data-export-modal";
import { PreferencesDataImportModal } from "./data-import-modal";

export const PreferencesDataTab = () => {
  const t = useTranslations("UserPreferences");
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  return (
    <TabsContent value="my-data" className="space-y-6">
      <section className="space-y-4">
        <p className="text-muted-foreground text-sm">
          {t("myData.description", { siteName })}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => setIsImportDialogOpen(true)}>
            {t("myData.import.button")}
          </Button>
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
            {t("myData.export.button")}
          </Button>
        </div>
      </section>

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
    </TabsContent>
  );
};
