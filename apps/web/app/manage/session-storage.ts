"use client";

import { safeParse } from "@/lib/json";
import type { z } from "zod";

export const storageKeys = {
  manageProvider: "manage:provider",
  manageQuery: "manage:q",
  manageSort: "manage:sort",
  managePriority: "manage:priority",
  manageHidden: "manage:hidden",
  manageTier: "manage:tier",
} as const;

export function setStorageItem(key: string, value: unknown): void {
  if (typeof sessionStorage === "undefined") return;
  const strValue = typeof value === "string" ? value : JSON.stringify(value);
  try {
    sessionStorage.setItem(key, strValue);
  } catch {
    /* ignore */
  }
}

export function getStorageItem(key: string): string | undefined;
export function getStorageItem<T>(
  key: string,
  schema: z.ZodType<T>
): T | undefined;
export function getStorageItem<T>(
  key: string,
  schema?: z.ZodType<T>
): T | string | undefined {
  if (typeof sessionStorage === "undefined") return undefined;
  const value = sessionStorage.getItem(key);
  if (!value) return undefined;
  if (schema) {
    return safeParse(value, schema);
  }
  return value;
}
