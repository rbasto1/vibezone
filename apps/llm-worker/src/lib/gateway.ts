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

function ensureGateway(env: Env, key: GatewayAdapterKey, plugins: string[]) {
  if (adapters.has(key)) {
    return adapters.get(key)!;
  }

  const reasonPlugin = plugins.find((p) => p.startsWith("reason-"));
  const effort = reasonPlugin?.substring("reason-".length) ?? "low";
  const reasoning = effort === "none" ? { enabled: false } : { effort };

  const config = getGatewayConfig(env, key);
  const adapter = createOpenRouter({
    compatibility: config.compatibility ?? "strict",
    apiKey: config.apiKey,
    headers: config.headers,
    baseURL: config.baseURL,
    extraBody: { reasoning },
  });

  adapters.set(key, adapter);
  return adapter;
}

export function getAdapterForProvider(
  env: Env,
  providerId: string,
  plugins: string[]
): OpenRouterProvider {
  const gw = getGatewayForProvider(providerId);
  return ensureGateway(env, gw, plugins);
}

export function getOpenRouter(env: Env, plugins: string[]): OpenRouterProvider {
  return ensureGateway(env, "openrouter", plugins);
}

function getGatewayForProvider(providerId: string): GatewayAdapterKey {
  switch (providerId) {
    case "maritacaai":
      return "maritacaai";
    default:
      return "openrouter";
  }
}
