import { motion } from "framer-motion";
import type { FC } from "react";

export interface ThreadWelcomeSuggestionsProps {
  onSelect: (text: string) => void;
}

export const ThreadWelcomeSuggestions: FC<ThreadWelcomeSuggestionsProps> = ({
  onSelect,
}) => {
  const items = [
    {
      title: "What are the advantages",
      label: "of using Assistant Cloud?",
      action: "What are the advantages of using Assistant Cloud?",
    },
    {
      title: "Write code to",
      label: `demonstrate topological sorting`,
      action: `Write code to demonstrate topological sorting`,
    },
    {
      title: "Help me write an essay",
      label: `about AI chat applications`,
      action: `Help me write an essay about AI chat applications`,
    },
    {
      title: "What is the weather",
      label: "in San Francisco?",
      action: "What is the weather in San Francisco?",
    },
  ];
  return (
    <div className="grid w-full gap-2 sm:grid-cols-2">
      {items.map((s, i) => (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.05 * i }}
          key={`suggested-action-${s.title}-${i}`}
          // aui-thread-welcome-suggestion-display
          className="[&:nth-child(n+3)]:hidden sm:[&:nth-child(n+3)]:block"
        >
          <button
            key={`sg-${i}`}
            className="dark:hover:bg-accent/60 h-auto w-full flex-1 flex-wrap items-start justify-start gap-1 rounded-xl border px-4 py-3.5 text-left text-sm sm:flex-col"
            onClick={() => onSelect(s.action)}
          >
            <span className="font-medium">{s.title}</span>
            <p className="text-muted-foreground">{s.label}</p>
          </button>
        </motion.div>
      ))}
    </div>
  );
};
