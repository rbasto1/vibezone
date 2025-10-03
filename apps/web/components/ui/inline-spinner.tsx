import type { FC, HTMLAttributes } from "react";

import { cn } from "./utils";

export const InlineSpinner: FC<HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        `h-4 w-4 animate-spin rounded-full border-b-2 border-white`,
        className
      )}
      {...props}
    />
  );
};
