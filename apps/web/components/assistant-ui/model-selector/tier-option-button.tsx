import { cn } from "@/components/ui/utils";
import type { LucideProps } from "lucide-react";
import type { FC, ForwardRefExoticComponent, RefAttributes } from "react";
import type { TierOptionId } from "./model-dropdown-constants";

interface TierOptionButtonProps {
  id: TierOptionId;
  selected: boolean;
  label: string | null;
  icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  color: string | undefined;
  onClick: (id: TierOptionId) => void;
}

export const TierOptionButton: FC<TierOptionButtonProps> = ({
  id,
  selected,
  label,
  icon: Icon,
  color,
  onClick,
}) => {
  return (
    <button
      key={id}
      className={cn(
        "px-3 h-8 text-xs inline-flex items-center gap-1.5 rounded-[6px] cursor-pointer",
        "transition-colors",
        selected
          ? "bg-primary text-primary-foreground hover:bg-primary! hover:text-primary-foreground px-2"
          : "text-foreground/80 hover:bg-background/50 px-2"
      )}
      data-active={selected}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick(id);
      }}
    >
      <Icon className={cn("size-4", !selected && color)} />
      {label}
    </button>
  );
};
