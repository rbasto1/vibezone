import { Provider } from "./schemas";

export function getApiKey(env: Env, provider: Provider): string {
  switch (provider) {
    case "openai":
      return env.OPENAI_API_KEY;
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
  }
}
