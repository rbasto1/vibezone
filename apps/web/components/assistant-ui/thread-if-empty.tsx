import { useAssistantState } from "@assistant-ui/react";
import type { FC } from "react";

interface ThreadIfEmptyProps {
  children: React.ReactNode;
  empty?: boolean;
}

export const ThreadIfEmpty: FC<ThreadIfEmptyProps> = ({
  children,
  empty = true,
}) => {
  const isEmpty = useAssistantState(
    ({ thread }) =>
      empty ===
      !thread.messages.some((m) => m.role === "user" || m.role === "assistant")
  );
  return isEmpty ? children : null;
};
