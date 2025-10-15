# Vibezone

Vibezone is a web application that allows users to chat with 2 or more AI models at the same time. The is a "global composer" components for the user to type a prompt that will go to all 2+ models, and each model will respond to the prompt in their own thread window.

## Structure

- apps/web
  - Next.js application
  - API routes with tRPC
  - State management with jotai
  - Authentication by Clerk.com
  - UI build with React components by assistant-ui.com
  - Internationalization with next-intl (en, pt-BR, de)
  - Theme management with next-themes

- apps/llm-worker
  - Cloudflare Worker
  - Streams LLM responses to client
  - LLM adapter with Vercel AI SDK and OpenRouter.ai

## Components

- Database: Neon Postgres
- ORM: Drizzle
