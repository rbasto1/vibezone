import { cn } from "@/components/ui/utils";

interface NewTagProps {
  className?: string;
}

export const NewTag: React.FC<NewTagProps> = ({ className }) => (
  <span 
    className={cn(
      "text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-800 dark:text-blue-300",
      className
    )}
  >
    New
  </span>
);
