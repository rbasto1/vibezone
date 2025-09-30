import { LOCAL_URL } from "./constants";

const targetEnv = process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV || "local";
const productionUrl = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://vibezone.ai";
const vercelUrl = process.env.NEXT_PUBLIC_VERCEL_URL
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : null;

export const baseUrl =
  targetEnv === "production"
    ? productionUrl
    : targetEnv === "preview"
      ? (vercelUrl ?? productionUrl)
      : LOCAL_URL;
