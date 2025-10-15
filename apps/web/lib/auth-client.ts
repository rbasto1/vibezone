"use client";

import { useClerk } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { useCallback } from "react";

import { useAuthContext } from "@/lib/auth-context";

export const useUser = useAuthContext;

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
