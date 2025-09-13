import type { OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { Env } from "../worker";

export interface GatewayConfig {
  apiKey: string;
  headers?: Record<string, string>;
}

function getGatewayConfig(env: Env): GatewayConfig {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("No OpenRouter API key configured");
  }

  return {
    apiKey: env.OPENROUTER_API_KEY,
    headers: {
      "X-Title":
        env.ENVIRONMENT === "development" ? "Vibezone (Dev)" : "Vibezone",
    },
  };
}

let adapter: OpenRouterProvider | null = null;
export function getOpenRouter(env: Env): OpenRouterProvider {
  if (!adapter) {
    const gateway = getGatewayConfig(env);
    adapter = createOpenRouter({
      apiKey: gateway.apiKey,
      headers: gateway.headers,
    });
  }
  return adapter;
}
