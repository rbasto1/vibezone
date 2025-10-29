import { useTranslations } from "next-intl";
import type { FC } from "react";

import { TabsContent } from "@/components/ui/tabs";
import { PreferenceRow } from "./preference-row";
import {
  ReasoningEffortSlider,
  type ReasoningEffortValue,
} from "./reasoning-effort-slider";

interface PreferencesGeneralTabProps {
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
  webSearch: boolean;
  setWebSearch: (value: boolean) => void;
  enterKeySends: boolean;
  setEnterKeySends: (value: boolean) => void;
  shiftEnterKeySends: boolean;
  setShiftEnterKeySends: (value: boolean) => void;
  reasoningEffort: ReasoningEffortValue;
  setReasoningEffort: (value: ReasoningEffortValue) => void;
}

export const PreferencesGeneralTab: FC<PreferencesGeneralTabProps> = ({
  autoScroll,
  setAutoScroll,
  webSearch,
  setWebSearch,
  enterKeySends,
  setEnterKeySends,
  shiftEnterKeySends,
  setShiftEnterKeySends,
  reasoningEffort,
  setReasoningEffort,
}) => {
  const t = useTranslations("UserPreferences");

  return (
    <TabsContent value="general" className="space-y-6">
      <section className="space-y-6">
        <PreferenceRow
          id="auto-scroll"
          label={t("autoScroll.label")}
          description={t("autoScroll.description")}
          checked={autoScroll}
          onToggle={setAutoScroll}
        />

        <PreferenceRow
          id="web-search"
          label={t("webSearch.label")}
          description={t("webSearch.description")}
          checked={webSearch}
          onToggle={setWebSearch}
        />

        <PreferenceRow
          id="enter-key-sends"
          label={t("enterKeySends.label")}
          description={t("enterKeySends.description")}
          checked={enterKeySends}
          onToggle={setEnterKeySends}
        />

        <PreferenceRow
          id="shift-enter-key-sends"
          label={t("shiftEnterKeySends.label")}
          description={t("shiftEnterKeySends.description")}
          checked={shiftEnterKeySends}
          onToggle={setShiftEnterKeySends}
        />

        <ReasoningEffortSlider
          effort={reasoningEffort}
          onChange={setReasoningEffort}
          label={t("reasoningEffort.label")}
          description={t("reasoningEffort.description")}
          lowLabel={t("reasoningEffort.low")}
          mediumLabel={t("reasoningEffort.medium")}
          highLabel={t("reasoningEffort.high")}
        />
      </section>
    </TabsContent>
  );
};
