export interface ModelPricing {
  prompt: string;
  completion: string;
  request?: string;
  image?: string;
  web_search?: string;
  internal_reasoning?: string;
  input_cache_read?: string;
  input_cache_write?: string;
}

export interface ModelTopProvider {
  is_moderated: boolean;
  context_length: number | null;
  max_completion_tokens: number | null;
}

export interface MessageMetadata {
  custom: Record<string, unknown>;
  steps?: unknown[];
  unstable_data?: unknown[];
  unstable_state?: null;
  unstable_annotations?: unknown[];
}

export interface MessageStatus {
  type?: "running" | "requires-action" | "complete" | "incomplete";
  reason?:
    | "tool-calls"
    | "stop"
    | "unknown"
    | "cancelled"
    | "length"
    | "content-filter"
    | "other"
    | "error"
    | "interrupt";
  error?: unknown;
}
