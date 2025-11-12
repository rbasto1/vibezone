"use client";

import { useMemo } from "react";

const APPLE_PLATFORMS = ["mac", "iphone", "ipad", "ipod"];

export function useIsMac() {
  const isMac = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const nav = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const platformOrAgent = nav.userAgentData?.platform ?? nav.userAgent ?? "";
    const normalized = platformOrAgent.toLowerCase();
    const detected = APPLE_PLATFORMS.some((name) => normalized.includes(name));
    return detected;
  }, []);

  return isMac;
}
