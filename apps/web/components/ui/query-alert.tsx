import { type FC } from "react";

import { Alert, AlertDescription, AlertTitle } from "./alert";
import { CircleXIcon } from "./icons/circle-x-icon";

export const QueryAlert: FC<QueryAlertProps> = ({ error }) => {
  if (!error) return null;
  const message =
    error.message ??
    (error.data as { message: string | undefined })?.message ??
    JSON.stringify(error.data);
  return (
    <Alert variant="destructive" className="mb-4">
      <CircleXIcon className="mr-2 h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

interface QueryAlertProps {
  error: TRPCClientErrorLike | null;
}

interface TRPCClientErrorLike {
  message: string;
  data?: unknown;
}
