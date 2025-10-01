import type {
  QueryObserverResult,
  RefetchOptions,
} from "@tanstack/react-query";
import { RefreshCwIcon } from "lucide-react";
import type { FC } from "react";
import { Button } from "./button";

interface AdminHeaderProps {
  title: string;
  description: string;
  onRefetch?: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult<unknown, unknown>>;
  isFetching?: boolean;
}

export const AdminHeader: FC<AdminHeaderProps> = (props) => {
  const { title, description } = props;
  const { onRefetch, isFetching } =
    "onRefetch" in props
      ? props
      : { onRefetch: undefined, isFetching: undefined };

  return (
    <div className="flex items-center justify-between">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {onRefetch && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => onRefetch()}
          className="ml-2"
          loading={isFetching}
        >
          <RefreshCwIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
