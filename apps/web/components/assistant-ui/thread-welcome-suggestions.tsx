import { useModelsValue } from "@/hooks/use-models";
import { motion } from "framer-motion";
import { CodeIcon, DramaIcon, StarIcon } from "lucide-react";
import type { FC } from "react";

export interface ThreadWelcomeSuggestionsProps {
  onSelect: (modelIds: string[]) => void;
}

export const ThreadWelcomeSuggestions: FC<ThreadWelcomeSuggestionsProps> = ({
  onSelect,
}) => {
  const { models } = useModelsValue();
  const items = [
    {
      key: "flagship",
      icon: <StarIcon size={32} />,
      title: "Flagship Models",
      label: "Try the best models of the leading AI companies",
      models: models.filter((m) => m.isFlagship),
    },
    {
      key: "coder",
      icon: <CodeIcon size={32} />,
      title: "Best Coders",
      label: "Compare the abilities of the best models for vibe coding",
      models: models.filter((m) => m.isCoder),
    },
    {
      key: "artist",
      icon: <DramaIcon size={32} />,
      title: "Roleplay Masters",
      label: "Chat with the best models for roleplay",
      models: models.filter((m) => m.isArtist),
    },
  ];
  return (
    <div className="flex w-full gap-2">
      {items.map((s, i) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * i }}
          key={`suggested-action-${s.title}-${i}`}
          // aui-thread-welcome-suggestion-display
          className="flex-1"
        >
          <button
            key={s.key}
            className="dark:hover:bg-accent/60 h-full w-full flex-1 flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-sm"
            onClick={() => onSelect(s.models.map((m) => m.id))}
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
