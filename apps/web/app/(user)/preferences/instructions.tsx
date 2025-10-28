import { TabsContent } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import type { FC } from "react";

interface PreferencesInstructionsTabProps {
  systemPrompt: string;
  setSystemPrompt: (value: string) => void;
}

export const PreferencesInstructionsTab: FC<
  PreferencesInstructionsTabProps
> = ({ systemPrompt, setSystemPrompt }) => {
  const t = useTranslations("UserPreferences");
  return (
    <TabsContent value="instructions" className="space-y-6">
      <section className="space-y-2">
        <div>
          <div className="text-sm font-medium">{t("systemPrompt.label")}</div>
          <p className="text-muted-foreground text-sm">
            {t("systemPrompt.description")}
          </p>
        </div>
        <textarea
          className="min-h-[180px] w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          value={systemPrompt}
          onChange={(event) => setSystemPrompt(event.target.value)}
          placeholder={t("systemPrompt.placeholder")}
          maxLength={4000}
        />
      </section>
    </TabsContent>
  );
};
