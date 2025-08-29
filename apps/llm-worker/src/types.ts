// Worker environment variables used by our handlers
export interface Env {
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  // GEMINI_API_KEY: string;
  WORKER_ALLOWED_ORIGIN?: string;
}
