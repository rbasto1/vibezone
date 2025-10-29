# Instructions

- Use `pnpm add` to install dependencies; do not modify `package.json` directly
- Prefer `.catch` over `try/catch` blocks; if necessary, separate code into smaller functions that return/reject their operations
- One React component per file
- Declare interfaces instead of inline types
- Always create zod schemas for parsing "JSON.parse" or "response.json()" output
- Prefer arrow functions for component definitions
- Avoid `any` types - use proper TypeScript generics or `unknown`
- Log errors appropriately: always pass on the actual error message to the client, debugging is of first importance
- No manual migrations needed - Drizzle automatically generates and applies migrations
- Soft deletes: Use `deletedAt` timestamp field for active/inactive records
  - Filter with `isNull(table.deletedAt)` for active records
- Use `useState<Type>()` instead of `useState<Type | null>(null)` for simplicity, since useState assumes the type can be undefined when you initialize the state with empty parentheses
- When running shell commands, prefix any command that could run indefinitely or for too long with `timeout 10s` (adjust as needed)
- Do not use transactions, since we are using @neondatabase/serverless that doesn't support them
