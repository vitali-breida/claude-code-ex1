# CLAUDE.md — Multi-Tool Finance Agent

## Project structure

```
src/
├── index.ts              # CLI REPL — readline loop, entry point
├── agent.ts              # Agentic loop — drives the while + stop_reason cycle
├── types.ts              # Shared types: ToolResponse, ErrorCategory, EscalationRecord
└── tools/
    ├── definitions.ts    # Tool schemas sent to Claude (Anthropic.Tool[])
    ├── handlers.ts       # Tool implementations with fake data
    └── hook.ts           # Pre-execution interceptor — escalation logic
```

## Code conventions

### Language & runtime
- TypeScript with ESM modules (`"type": "module"` in package.json)
- Run via `tsx`; import paths must include `.ts` extension
- Target: Node 22

### Imports
- Always include `.ts` extension in local imports: `import { foo } from "./bar.ts"`
- SDK types are imported from `@anthropic-ai/sdk` directly; no re-exporting

### Types
- Shared types live in `src/types.ts`; do not inline them in feature files
- Tool handlers always return `ToolResponse<T>` — either `{ data: T }` or `{ error: ToolErrorResponse }`
- Use `type` imports for types that are only used at compile time: `import type { ... }`

### Error handling
- All tool errors are structured: `{ errorCategory, isRetryable, description }`
- `errorCategory`: `"transient"` | `"validation"` | `"permission"`
- Do not throw inside tool handlers — return `{ error: ... }` instead
- Unexpected `stop_reason` values in the agent loop should throw (they are programmer errors)

### Naming
- Tool names: `snake_case` (e.g. `transfer_funds`)
- Functions and variables: `camelCase`
- Types and interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` for module-level config values (e.g. `TRANSFER_THRESHOLD`)

### Comments
- Section separators use `// ── Label ───...` style (see existing files)
- Only comment non-obvious logic; self-evident code stays uncommented
- All comments in English

### Agent loop
- History is mutated in place — push user message, then assistant content, then tool results
- Tool use blocks must be preserved verbatim in history (do not extract text only)
- The hook (`intercept`) runs before every tool execution; blocked tools return a result, not an error

### Adding a new tool
1. Add the schema to `tools/definitions.ts`
2. Add the handler function in `tools/handlers.ts` and register it in `executeToolHandler`
3. Add any pre-execution rules to `tools/hook.ts` if needed
4. Add new types to `types.ts` if the response shape is new
5. Add the tool name to `README.md` (CI will fail if missing — checked by `scripts/check-docs.mjs`)
6. Add unit tests in `src/tools/handlers.test.ts` covering happy path and error cases

### Testing
- Test runner: Vitest (`npm test`)
- Test files live next to source: `handlers.test.ts`, `hook.test.ts`
- Write tests directly from Gherkin acceptance criteria when available
- Do not mock `frozenAccounts` or module state — rely on test execution order within a describe block

### Observability
- `agent.ts` emits JSON-L to `stderr` on every tool call and agent iteration
- Event types: `tool_call`, `tool_escalated`, `agent_iteration`
- Every log entry includes `ts` (ISO timestamp); `tool_call` also includes `durationMs`
- Do not log sensitive financial amounts or PII in free-text fields
