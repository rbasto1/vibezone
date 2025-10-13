"use client";

import { useClerk, useUser as useUserClerk } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { useCallback } from "react";

export const useUser = () => {
  const { user, isSignedIn } = useUserClerk();
  return isSignedIn ? user : null;
};

export const useOpenSignIn = () => {
  const { openSignIn } = useClerk();
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? dark : "simple";
  return useCallback(
    () =>
      openSignIn({
        appearance: { theme },
      }),
    [openSignIn, theme]
  );
};
