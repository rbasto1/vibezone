# Instructions

- Use `pnpm add` to install dependencies; do not modify `package.json` directly
- Prefer `.catch` over `try/catch` blocks; if necessary, separate code into smaller functions that return/reject their operations
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
- Prefer placing React components in their own files, and break up large components into smaller, separate components/files
- tRPC automatically keeps Date objects between backend and frontend, so no need to convert to/from ISO strings
- Modals should be rendered conditionally, not with `open` prop, so their state is reset on close
- Avoid useEffect to update state, try to wire updates into direct user actions
