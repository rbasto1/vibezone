import type { OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { Env } from "../worker";

type GatewayAdapterKey = "openrouter" | "maritacaai";

interface GatewayConfig {
  apiKey: string;
  headers?: Record<string, string>;
  baseURL?: string;
  compatibility?: "strict" | "compatible";
}

function getGatewayConfig(env: Env, key: GatewayAdapterKey): GatewayConfig {
  if (key === "maritacaai") {
    if (!env.MARITACAAI_API_KEY) {
      console.error({ message: "No Maritaca AI API key configured" });
      throw new Error("No Maritaca AI API key configured");
    }

    return {
      apiKey: env.MARITACAAI_API_KEY,
      baseURL: "https://chat.maritaca.ai/api",
      compatibility: "compatible",
    };
  }

  if (!env.OPENROUTER_API_KEY) {
    console.error({ message: "No OpenRouter API key configured" });
    throw new Error("No OpenRouter API key configured");
  }

  return {
    apiKey: env.OPENROUTER_API_KEY,
    headers: {
      "X-Title":
        env.ENVIRONMENT === "development" ? "Vibezone (Dev)" : "Vibezone",
    },
    compatibility: "strict",
  };
}

const adapters = new Map<GatewayAdapterKey, OpenRouterProvider>();

function ensureGateway(env: Env, key: GatewayAdapterKey) {
  if (adapters.has(key)) {
    return adapters.get(key)!;
  }

  const config = getGatewayConfig(env, key);
  const adapter = createOpenRouter({
    compatibility: config.compatibility ?? "strict",
    apiKey: config.apiKey,
    headers: config.headers,
    baseURL: config.baseURL,
  });
  adapters.set(key, adapter);
  return adapter;
}

export function getAdapterForProvider(
  env: Env,
  providerId: string
): OpenRouterProvider {
  const gw = getGatewayForProvider(providerId);
  return ensureGateway(env, gw);
}

export function getOpenRouter(env: Env): OpenRouterProvider {
  return ensureGateway(env, "openrouter");
}

function getGatewayForProvider(providerId: string): GatewayAdapterKey {
  switch (providerId) {
    case "maritacaai":
      return "maritacaai";
    default:
      return "openrouter";
  }
}
