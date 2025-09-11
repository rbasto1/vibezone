import { CircleXIcon } from "@/components/ui/icons/circle-x-icon";
import type { FC } from "react";

interface ThreadErrorProps {
  error: Error;
}

export const ThreadError: FC<ThreadErrorProps> = ({ error }) => {
  return (
    <div className="mx-auto w-full max-w-[var(--thread-max-width)] px-[var(--thread-padding-x)]">
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/50">
        <div className="flex-shrink-0">
          <CircleXIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Something went wrong
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300 overflow-y-hidden">
            {error.message}
          </p>
        </div>
      </div>
    </div>
  );
};
