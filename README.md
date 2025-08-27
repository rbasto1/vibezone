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
- Drizzle ORM for database management
- Neon PostgreSQL for database hosting

## Project Structure

```
├── apps/
│   ├── web/          # Next.js frontend (React 19) based on assistant-ui
│   └── llm-worker/   # Cloudflare Worker API endpoints
├── packages/
│   └── config/       # Shared TypeScript/ESLint/Prettier configs
└── turbo.json        # Turborepo pipeline configuration
```

## Database Setup

The project uses Drizzle ORM with Neon PostgreSQL for database management.

### 1. Set up Neon Database

1. Create a Neon account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy your database connection string

### 2. Configure Environment Variables

Create a `.env` file in the `apps/web` directory:

```bash
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

### 3. Initialize Database

```bash
# Install dependencies
pnpm install

# No need to generate with Drizzle. Just push the database schema
pnpm db:push

# Seed the database with initial data
pnpm db:seed
```

### Available Database Scripts

- `pnpm db:generate` - Generate migration files
- `pnpm db:push` - Push schema changes to database
- `pnpm db:seed` - Seed database with initial data
- `pnpm db:studio` - Open Drizzle Studio for database management

### Database Schema

See `apps/web/db/schema`
