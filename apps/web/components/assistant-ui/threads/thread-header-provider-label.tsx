import { ProviderIcon } from "@/components/ui/providers/provider";
import type { FC } from "react";

interface ThreadHeaderProviderLabelProps {
  providerId: string | undefined;
  modelName: string;
}

export const ThreadHeaderProviderLabel: FC<ThreadHeaderProviderLabelProps> = ({
  providerId,
  modelName,
}) => {
  return (
    <span className="flex items-center gap-2 truncate min-w-0">
      {providerId && <ProviderIcon providerId={providerId} />}
      <span className="truncate">{modelName}</span>
    </span>
  );
};
