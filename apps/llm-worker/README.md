# Vibezone LLM Worker

Cloudflare Worker for Vibezone's LLM API streaming endpoints.

## Phase 1 (Completed)

**Mock Implementation Only**

- Health check endpoint: `/health`
- Mock streaming endpoints: `/stream/{openai,anthropic,gemini}`
- Returns placeholder JSON responses
- No real API calls

## Phase 2 (In Progress)

**Real LLM Integration**

- ✅ OpenAI streaming endpoint: `/api/chat/openai`
- 🔄 Anthropic and Gemini streaming (coming soon)
- Server-Sent Events (SSE) for real-time streaming
- API key management via Wrangler secrets
- Error handling and CORS configuration

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

### `POST /api/chat/openai` (Phase 2)

Real OpenAI streaming endpoint.

**Request Body:**

```json
{
  "messages": [{ "role": "user", "content": "Hello, how are you?" }],
  "config": {
    "temperature": 0.7,
    "maxTokens": 1000,
    "model": "gpt-4o-mini"
  }
}
```

**Response:** Server-Sent Events stream from OpenAI API

**Example:**

```bash
curl -N -X POST 'http://127.0.0.1:8787/api/chat/openai' \
  -H 'content-type: application/json' \
  --data '{ "messages": [{ "role": "user", "content": "Say hello" }] }'
```

### `POST /stream/{provider}` (Phase 1 - Mock)

Mock streaming endpoints for `openai`, `anthropic`, `gemini`.

**Example:**

```bash
curl http://localhost:8787/stream/openai
```

## Configuration

### Environment Variables

Create `.env` for local development:

```bash
ENVIRONMENT=development
```

### Secrets (Phase 2)

Set your OpenAI API key:

```bash
echo "OPENAI_API_KEY=sk-..." | wrangler secret put OPENAI_API_KEY
```

Optional: Set allowed origin for production:

```bash
echo "WORKER_ALLOWED_ORIGIN=https://yourdomain.com" | wrangler secret put WORKER_ALLOWED_ORIGIN
```

## Phase 2 Implementation Status

1. **✅ OpenAI Integration**
   - Streaming responses from OpenAI API
   - Server-Sent Events pass-through
   - CORS configuration
   - Error handling and validation

2. **🔄 Anthropic Integration** (Coming Soon)
   - Claude streaming endpoint
   - API key management

3. **🔄 Gemini Integration** (Coming Soon)
   - Google Gemini streaming
   - API key management

4. **✅ Security & Error Handling**
   - API key validation
   - Request sanitization
   - CORS configuration
   - Abort handling
