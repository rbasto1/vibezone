import { useTranslations } from "next-intl";
import type { FC } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/components/ui/utils";
import type { ReasoningEffort } from "@/db";

export type ReasoningEffortValue = Exclude<ReasoningEffort, "none">;

interface PreferencesGeneralTabProps {
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
  webSearch: boolean;
  setWebSearch: (value: boolean) => void;
  reasoningEffort: ReasoningEffortValue;
  setReasoningEffort: (value: ReasoningEffortValue) => void;
}

export const PreferencesGeneralTab: FC<PreferencesGeneralTabProps> = ({
  autoScroll,
  setAutoScroll,
  webSearch,
  setWebSearch,
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

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="space-y-1">
            <span className="text-sm font-medium">
              {t("reasoningEffort.label")}
            </span>
            <p className="text-muted-foreground text-sm">
              {t("reasoningEffort.description")}
            </p>
          </div>
          <Select
            value={reasoningEffort}
            onValueChange={(value) =>
              setReasoningEffort(value as ReasoningEffortValue)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t("reasoningEffort.low")}</SelectItem>
              <SelectItem value="medium">
                {t("reasoningEffort.medium")}
              </SelectItem>
              <SelectItem value="high">{t("reasoningEffort.high")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>
    </TabsContent>
  );
};
interface PreferenceRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
}

const PreferenceRow = ({
  id,
  label,
  description,
  checked,
  onToggle,
}: PreferenceRowProps) => {
  const labelId = `${id}-label`;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="space-y-1" id={labelId}>
        <span className="text-sm font-medium">{label}</span>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <PreferenceToggle
        id={id}
        checked={checked}
        onToggle={onToggle}
        ariaLabelledBy={labelId}
      />
    </div>
  );
};

interface PreferenceToggleProps {
  id: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
  ariaLabelledBy?: string;
}

const PreferenceToggle = ({
  id,
  checked,
  onToggle,
  ariaLabelledBy,
}: PreferenceToggleProps) => {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
      onClick={() => onToggle(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full border transition",
        checked ? "border-primary bg-primary" : "border-border bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 translate-x-1 rounded-full bg-background shadow transition",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
};
