# Vibezone LLM Worker

Cloudflare Worker for Vibezone's LLM API streaming endpoints.

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start local development server
pnpm --filter=llm-worker dev   # Runs on http://localhost:8787

# Deploy to Cloudflare Workers
pnpm --filter=llm-worker deploy

# Type checking
pnpm --filter=llm-worker typecheck
```

## API Endpoints

### `GET /health`

Returns worker status and current phase.

### `POST /stream`

Real OpenAI/Anthropic streaming endpoint.

**Response:** Server-Sent Events stream from OpenAI API

**Example:**

```bash
curl -N -X POST 'http://127.0.0.1:8787/stream' \
  -H 'content-type: application/json' \
  --data '{ "messages": [{ "role": "user", "content": "Say hello" }] }'
```
