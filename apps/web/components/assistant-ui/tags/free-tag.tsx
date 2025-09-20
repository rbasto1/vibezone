import { cn } from "@/components/ui/utils";

interface FreeTagProps {
  className?: string;
}

export const FreeTag: React.FC<FreeTagProps> = ({ className }) => (
  <span 
    className={cn(
      "text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-800 dark:text-green-300",
      className
    )}
  >
    Free
  </span>
);
