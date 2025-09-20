import { LOCAL_URL, SITE_URL } from "./constants";

const targetEnv = process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV || "local";
const productionUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
  : SITE_URL;
const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : null;

export const baseUrl =
  targetEnv === "production"
    ? (productionUrl ?? SITE_URL)
    : targetEnv === "preview"
      ? (vercelUrl ?? SITE_URL)
      : LOCAL_URL;
