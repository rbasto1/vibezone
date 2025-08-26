// Extend the generated Cloudflare.Env interface for secrets
export interface Env extends Cloudflare.Env {
  OPENAI_API_KEY: string;
  // ANTHROPIC_API_KEY: string;
  // GEMINI_API_KEY: string;
  WORKER_ALLOWED_ORIGIN?: string;
}
