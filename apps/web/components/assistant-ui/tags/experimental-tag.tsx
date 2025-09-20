import { cn } from "@/components/ui/utils";

interface ExperimentalTagProps {
  className?: string;
}

export const ExperimentalTag: React.FC<ExperimentalTagProps> = ({ className }) => (
  <span 
    className={cn(
      "text-[10px] px-1.5 py-0.5 rounded bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-300",
      className
    )}
  >
    Experimental
  </span>
);
