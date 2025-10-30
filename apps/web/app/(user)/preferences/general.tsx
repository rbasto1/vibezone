import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { TabsContent } from "@/components/ui/tabs";
import { useMutatePreferences } from "@/hooks/use-mutate-preferences";
import { useUserPreferencesValue } from "@/hooks/use-user-preferences";
import type { PreferencesAtom } from "@/store/preferences";
import { PreferenceRow } from "./preference-row";
import { ReasoningEffortSlider } from "./reasoning-effort-slider";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : JSON.stringify(error);

export const PreferencesGeneralTab = () => {
  const t = useTranslations("UserPreferences");
  const preferences = useUserPreferencesValue();
  const mutatePreferences = useMutatePreferences({
    onError: (error: unknown) => {
      console.error("Error saving preferences:", error);
      const message = getErrorMessage(error);
      toast.error(t("toast.error", { message }));
    },
  });

  const handleChange = (key: keyof PreferencesAtom, value: unknown) => {
    const previous = preferences[key];
    if (value === previous) return;

    void mutatePreferences(
      { [key]: value },
      { previousValues: { [key]: previous } }
    );
  };

  return (
    <TabsContent value="general" className="space-y-6">
      <section className="space-y-6">
        <PreferenceRow
          id="auto-scroll"
          label={t("autoScroll.label")}
          description={t("autoScroll.description")}
          checked={preferences.autoScroll}
          onToggle={(value) => handleChange("autoScroll", value)}
        />

        <PreferenceRow
          id="web-search"
          label={t("webSearch.label")}
          description={t("webSearch.description")}
          checked={preferences.webSearch}
          onToggle={(value) => handleChange("webSearch", value)}
        />

        <PreferenceRow
          id="enter-key-sends"
          label={t("enterKeySends.label")}
          description={t("enterKeySends.description")}
          checked={preferences.enterKeySends}
          onToggle={(value) => handleChange("enterKeySends", value)}
        />

        <PreferenceRow
          id="shift-enter-key-sends"
          label={t("shiftEnterKeySends.label")}
          description={t("shiftEnterKeySends.description")}
          checked={preferences.shiftEnterKeySends}
          onToggle={(value) => handleChange("shiftEnterKeySends", value)}
        />

        <ReasoningEffortSlider
          label={t("reasoningEffort.label")}
          description={t("reasoningEffort.description")}
          lowLabel={t("reasoningEffort.low")}
          mediumLabel={t("reasoningEffort.medium")}
          highLabel={t("reasoningEffort.high")}
          onMutatePreferences={mutatePreferences}
        />
      </section>
    </TabsContent>
  );
};
