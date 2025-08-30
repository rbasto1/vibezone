export interface GatewayConfig {
  apiKey: string;
  headers?: Record<string, string>;
}

export function getGatewayConfig(env: Env): GatewayConfig {
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
