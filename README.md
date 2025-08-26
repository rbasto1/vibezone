# LLM Comparison Monorepo

A monorepo for comparing responses from multiple LLM providers (OpenAI, Anthropic, Gemini, etc.) with real-time streaming.

## Architecture

- Turborepo + pnpm workspaces for monorepo management
- React 19 + Next.js App Router for the web UI
- Cloudflare Workers for LLM API endpoints
- TypeScript throughout
- assistant-ui interface
- Tailwind CSS for styling
- Jotai for state management
- Lucide-react for icons
- Radix-ui for UI components
- shadcn/ui for components
- Tailwind-merge for merging Tailwind classes
- Tailwind-typography for typography

## Project Structure

```
├── apps/
│   ├── web/          # Next.js frontend (React 19) based on assistant-ui
│   └── llm-worker/   # Cloudflare Worker API endpoints
├── packages/
│   └── config/       # Shared TypeScript/ESLint/Prettier configs
└── turbo.json        # Turborepo pipeline configuration
```
