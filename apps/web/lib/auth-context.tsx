"use client";

import type { useUser } from "@clerk/nextjs";
import { createContext, useContext } from "react";

type User = NonNullable<Awaited<ReturnType<typeof useUser>>["user"]>;
export type FrontendUser = Pick<
  User,
  "id" | "firstName" | "lastName" | "imageUrl" | "hasImage" | "externalId"
>;

export const AuthContext = createContext<FrontendUser | null>(null);

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};
