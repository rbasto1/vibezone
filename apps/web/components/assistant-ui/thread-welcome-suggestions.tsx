import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { useModelsValue } from "@/hooks/use-models";
import { motion } from "framer-motion";
import type { FC } from "react";

export interface ThreadWelcomeSuggestionsProps {
  onSelect: (modelIds: string[]) => void;
}

export const ThreadWelcomeSuggestions: FC<ThreadWelcomeSuggestionsProps> = ({
  onSelect,
}) => {
  const { groups } = useModelsValue();

  const items = groups
    .filter((group) => group.promoted)
    .map((group) => ({
      key: group.id,
      icon: <DynamicIcon iconName={group.icon} size={32} />,
      title: group.title,
      label: group.label,
      models: group.models,
    }));
  return (
    <div className="flex w-full gap-2">
      {items.map((s, i) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * i }}
          key={`suggested-action-${s.title}-${i}`}
          className="flex-1"
        >
          <button
            key={s.key}
            className="dark:hover:bg-accent/60 h-full w-full flex-1 flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-sm cursor-pointer"
            onClick={() => onSelect(s.models)}
          >
            <div className="flex-shrink-0 mt-0.5">{s.icon}</div>
            <div className="flex-1 min-w-0">
              <span className="font-medium block">{s.title}</span>
              <p className="text-muted-foreground">{s.label}</p>
            </div>
          </button>
        </motion.div>
      ))}
    </div>
  );
};
