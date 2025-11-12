import { XIcon } from "lucide-react";
import type { FC } from "react";

interface RemovedFavoritesProps {
  models: string[];
  label: string;
  onRemove: (id: string) => void;
}
export const RemovedFavorites: FC<RemovedFavoritesProps> = ({
  models,
  label,
  onRemove,
}) => {
  return (
    <>
      {models.map((missingId) => (
        <div
          key={missingId}
          className="flex items-center justify-between rounded-md border border-dashed border-border px-2 py-1.5 text-sm text-muted-foreground"
        >
          <span className="truncate">{missingId}</span>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemove(missingId);
            }}
            aria-label={label}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </>
  );
};
