import type { OpenRouterProvider } from "@openrouter/ai-sdk-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { Env } from "../worker";
import type { GetConfigResponseSuccess } from "./request";

type GatewayAdapterKey = "openrouter" | "maritacaai";

interface GatewayConfig {
  apiKey: string;
  headers?: Record<string, string>;
  baseURL?: string;
  compatibility?: "strict" | "compatible";
}

const effortRatio: Record<"low" | "medium" | "high", number> = {
  low: 0.2,
  medium: 0.5,
  high: 0.8,
};

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
      "HTTP-Referer": "https://vibezone.ai",
      "X-Title": "Vibezone.ai",
    },
  };
}

function ensureGateway(
  env: Env,
  key: GatewayAdapterKey,
  completionRequest: GetConfigResponseSuccess
) {
  const { maxTokens, plugins, providerId } = completionRequest.config;
  const reasonPlugin = plugins.find((p) => p.startsWith("reason-"));
  const effort = reasonPlugin?.substring("reason-".length) ?? "low";
  if (
    effort !== "low" &&
    effort !== "medium" &&
    effort !== "high" &&
    effort !== "none"
  ) {
    console.error({ message: "Invalid reasoning effort", effort });
    throw new Error("Invalid reasoning effort");
  }
  const reasoning = getEffortSpecification(effort, maxTokens, providerId);

  const config = getGatewayConfig(env, key);
  const adapter = createOpenRouter({
    compatibility: config.compatibility ?? "strict",
    apiKey: config.apiKey,
    headers: config.headers,
    baseURL: config.baseURL,
    extraBody: key === "openrouter" ? { reasoning } : undefined,
  });

  return adapter;
}

export function getAdapterForProvider(
  env: Env,
  providerId: string,
  completionRequest: GetConfigResponseSuccess
): OpenRouterProvider {
  const gw = getGatewayForProvider(providerId);
  return ensureGateway(env, gw, completionRequest);
}

export function getOpenRouter(
  env: Env,
  completionRequest: GetConfigResponseSuccess
): OpenRouterProvider {
  return ensureGateway(env, "openrouter", completionRequest);
}

function getGatewayForProvider(providerId: string): GatewayAdapterKey {
  switch (providerId) {
    case "maritacaai":
      return "maritacaai";
    default:
      return "openrouter";
  }
}

function getEffortSpecification(
  effort: "low" | "medium" | "high" | "none",
  maxTokens: number,
  providerId: string
) {
  if (effort === "none") {
    return { enabled: false };
  }
  if (providerId === "anthropic") {
    return { effort };
  }
  return { max_tokens: Math.floor(maxTokens * effortRatio[effort]) };
}
