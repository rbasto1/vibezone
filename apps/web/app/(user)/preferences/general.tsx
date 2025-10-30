import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { TabsContent } from "@/components/ui/tabs";
import type { ReasoningEffort } from "@/db";
import { useMutatePreferences } from "@/hooks/use-mutate-preferences";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { PreferenceRow } from "./preference-row";
import {
  ReasoningEffortSlider,
  type ReasoningEffortValue,
} from "./reasoning-effort-slider";

const normalizeReasoningEffort = (
  effort: ReasoningEffort
): ReasoningEffortValue => (effort === "none" ? "low" : effort);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : JSON.stringify(error);

export const PreferencesGeneralTab = () => {
  const t = useTranslations("UserPreferences");
  const [preferences, setPreferences] = useUserPreferences();
  const mutatePreferences = useMutatePreferences({
    onError: (error: unknown) => {
      console.error("Error saving preferences:", error);
      const message = getErrorMessage(error);
      toast.error(t("toast.error", { message }));
    },
  });
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffortValue>(
    normalizeReasoningEffort(preferences.reasoningEffort)
  );
  const reasoningCommittedValueRef = useRef<ReasoningEffortValue>(
    normalizeReasoningEffort(preferences.reasoningEffort)
  );
  const reasoningPendingValueRef = useRef<ReasoningEffortValue | null>(null);
  const reasoningDebounceTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const reasoningMutationIdRef = useRef(0);

  useEffect(() => {
    const normalized = normalizeReasoningEffort(preferences.reasoningEffort);
    setReasoningEffort(normalized);
    reasoningCommittedValueRef.current = normalized;
    reasoningPendingValueRef.current = null;
    if (reasoningDebounceTimeoutRef.current) {
      clearTimeout(reasoningDebounceTimeoutRef.current);
      reasoningDebounceTimeoutRef.current = null;
    }
  }, [preferences.reasoningEffort]);

  useEffect(() => {
    return () => {
      if (reasoningDebounceTimeoutRef.current) {
        clearTimeout(reasoningDebounceTimeoutRef.current);
      }
    };
  }, []);

  const handleAutoScrollChange = (value: boolean) => {
    const previous = preferences.autoScroll;
    if (value === previous) return;

    mutatePreferences(
      { autoScroll: value },
      { previousValues: { autoScroll: previous } }
    );
  };

  const handleWebSearchChange = (value: boolean) => {
    const previous = preferences.webSearch;
    if (value === previous) return;

    mutatePreferences(
      { webSearch: value },
      { previousValues: { webSearch: previous } }
    );
  };

  const handleEnterKeySendsChange = (value: boolean) => {
    const previous = preferences.enterKeySends;
    if (value === previous) return;

    mutatePreferences(
      { enterKeySends: value },
      { previousValues: { enterKeySends: previous } }
    );
  };

  const handleShiftEnterKeySendsChange = (value: boolean) => {
    const previous = preferences.shiftEnterKeySends;
    if (value === previous) return;

    mutatePreferences(
      { shiftEnterKeySends: value },
      { previousValues: { shiftEnterKeySends: previous } }
    );
  };

  const handleReasoningEffortChange = (value: ReasoningEffortValue) => {
    setReasoningEffort(value);
    setPreferences((prev) => ({ ...prev, reasoningEffort: value }));

    if (reasoningDebounceTimeoutRef.current) {
      clearTimeout(reasoningDebounceTimeoutRef.current);
      reasoningDebounceTimeoutRef.current = null;
    }

    if (value === reasoningCommittedValueRef.current) {
      reasoningPendingValueRef.current = null;
      return;
    }

    reasoningPendingValueRef.current = value;
    const requestId = reasoningMutationIdRef.current + 1;
    reasoningMutationIdRef.current = requestId;

    reasoningDebounceTimeoutRef.current = setTimeout(() => {
      reasoningDebounceTimeoutRef.current = null;
      const targetValue = reasoningPendingValueRef.current;
      if (!targetValue) return;

      const previousValue = reasoningCommittedValueRef.current;

      mutatePreferences(
        { reasoningEffort: targetValue },
        {
          skipLocalUpdate: true,
          previousValues: { reasoningEffort: previousValue },
          onSuccess: () => {
            if (reasoningMutationIdRef.current !== requestId) return;
            reasoningCommittedValueRef.current = targetValue;
            reasoningPendingValueRef.current = null;
          },
          onError: () => {
            if (reasoningMutationIdRef.current !== requestId) return;
            reasoningPendingValueRef.current = null;
            const fallback = reasoningCommittedValueRef.current;
            setReasoningEffort(fallback);
            setPreferences((prev) => ({ ...prev, reasoningEffort: fallback }));
          },
        }
      );
    }, 300);
  };

  return (
    <TabsContent value="general" className="space-y-6">
      <section className="space-y-6">
        <PreferenceRow
          id="auto-scroll"
          label={t("autoScroll.label")}
          description={t("autoScroll.description")}
          checked={preferences.autoScroll}
          onToggle={handleAutoScrollChange}
        />

        <PreferenceRow
          id="web-search"
          label={t("webSearch.label")}
          description={t("webSearch.description")}
          checked={preferences.webSearch}
          onToggle={handleWebSearchChange}
        />

        <PreferenceRow
          id="enter-key-sends"
          label={t("enterKeySends.label")}
          description={t("enterKeySends.description")}
          checked={preferences.enterKeySends}
          onToggle={handleEnterKeySendsChange}
        />

        <PreferenceRow
          id="shift-enter-key-sends"
          label={t("shiftEnterKeySends.label")}
          description={t("shiftEnterKeySends.description")}
          checked={preferences.shiftEnterKeySends}
          onToggle={handleShiftEnterKeySendsChange}
        />

        <ReasoningEffortSlider
          effort={reasoningEffort}
          onChange={handleReasoningEffortChange}
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
