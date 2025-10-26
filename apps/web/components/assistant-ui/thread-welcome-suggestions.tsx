import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import type { FC } from "react";

import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { useModelsValue } from "@/hooks/use-models";

export interface ThreadWelcomeSuggestionsProps {
  onSelectGroup: (groupId: string) => void;
}

export const ThreadWelcomeSuggestions: FC<ThreadWelcomeSuggestionsProps> = ({
  onSelectGroup,
}) => {
  const { groups } = useModelsValue();
  const locale = useLocale();

  const items = groups
    .filter((group) => group.promoted)
    .map((group) => {
      const translation = group.translations.find(
        (t) => t.localeId === locale
      ) ??
        group.translations.find((t) => t.localeId === "en") ?? {
          title: group.id,
          label: "",
        };
      return {
        key: group.id,
        icon: <DynamicIcon iconName={group.icon} size={32} />,
        title: translation.title,
        label: translation.label,
      };
    });
  return (
    <div className="flex w-full gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory md:grid md:auto-rows-fr md:[grid-template-columns:repeat(auto-fit,minmax(0,1fr))] md:gap-2 md:overflow-visible md:pb-0 md:mx-0 md:px-0 md:snap-none">
      {items.map((s, i) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * i }}
          key={`suggested-action-${s.title}-${i}`}
          className="flex-shrink-0 min-w-[66vw] max-w-[66vw] snap-start snap-always md:min-w-0 md:max-w-none md:flex-1"
        >
          <button
            key={s.key}
            className="dark:hover:bg-accent/60 h-full w-full flex flex-col gap-2 rounded-xl border px-4 py-3.5 text-left text-sm cursor-pointer"
            onClick={() => onSelectGroup(s.key)}
          >
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0">{s.icon}</div>
              <span className="font-medium leading-tight">{s.title}</span>
            </div>
            <p className="text-muted-foreground leading-snug overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical]">
              {s.label}
            </p>
          </button>
        </motion.div>
      ))}
    </div>
  );
};
