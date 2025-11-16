import {
  ErrorPrimitive,
  MessagePrimitive,
  useAssistantState,
} from "@assistant-ui/react";
import type { FC } from "react";

export const MessageError: FC = () => {
  const error = useAssistantState(({ message }) => {
    return message.status?.type === "incomplete" &&
      message.status.reason === "error"
      ? message.status.error
      : undefined;
  });

  return (
    <MessagePrimitive.Error>
      {/* aui-message-error-root */}
      <ErrorPrimitive.Root className="border-destructive bg-destructive/10 dark:bg-destructive/5 text-destructive mt-2 rounded-md border p-3 text-sm dark:text-red-200">
        {/* aui-message-error-message */}
        <span className="line-clamp-2">
          {error
            ? typeof error === "string"
              ? error
              : JSON.stringify(error)
            : "The AI model failed to generate a response."}
        </span>
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
};
