import { cn } from "@/components/ui/utils";

interface IncludedTagProps {
  className?: string;
}

export const IncludedTag: React.FC<IncludedTagProps> = ({ className }) => (
  <span 
    className={cn(
      "text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
      className
    )}
  >
    Included
  </span>
);
