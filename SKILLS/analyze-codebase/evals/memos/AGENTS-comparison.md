# AGENTS-comparison.md

Comparison of a freshly synthesised candidate AGENTS.md (derived from the six knowledge files in `.context/`) against the existing `AGENTS.md` at the repository root.

---

## Summary

The candidate and the existing AGENTS.md are in very strong alignment. Both files cover the same six major concern areas: project snapshot, commands, code map, change routing, Go conventions, frontend conventions, database/proto rules, verification policy, and CI reference. The content in both files is drawn from the same underlying source of truth (AGENTS.md itself serves as the project rules file, and the knowledge files were built from the codebase it describes), so the information is essentially equivalent. The only meaningful differences are scope additions in the candidate (it explicitly lists `internal/ai/`, `internal/storage/`, `internal/webhook/`, `internal/scheduler/`, and `server/router/mcp/` in the code map) and minor phrasing differences in the commands and working rules sections. There are no factual contradictions between the two files.

---

## Confidence Score

**96 %**

Every section heading in the candidate has a close counterpart in the existing AGENTS.md. The candidate adds a few entries to the code map (newly discovered packages not listed in the original) and slightly reformats the working rules bullets, but the substance is identical. The 4 % deduction accounts for the handful of candidate code-map entries absent from the existing file and a marginal difference in how the "Working Rules" section is structured.

---

## Matching Coverage

Topics well-covered in both files:

- **Project snapshot**: Go 1.27.0, Echo v5, Connect RPC, gRPC-Gateway, Protocol Buffers, React 19, TypeScript 6, Vite 8, Tailwind v4, React Query v5, SQLite/MySQL/PostgreSQL.
- **Dev commands**: backend (`go run`, `go test`, `go mod tidy`, `golangci-lint`), frontend (`pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm release`), proto (`buf generate`, `buf lint`, `buf format`).
- **Code map**: `cmd/memos/main.go`, `server/server.go`, `server/auth/`, `server/router/api/v1/`, `server/router/fileserver/`, `server/router/frontend/`, `server/runner/`, `store/`, `store/db/{sqlite,mysql,postgres}/`, `proto/api/v1/`, `proto/store/`, `web/src/connect.ts`, `web/src/auth-state.ts`, `web/src/hooks/`, `web/src/contexts/`, `web/src/components/`, `web/src/themes/`.
- **Change routing table**: all seven change categories (Go service, store/migration, internal packages, frontend behavior, frontend build, proto API, public unauth route) with their corresponding update targets and verify commands.
- **Go conventions**: `errors.Wrap` mandate, `status.Errorf` for service errors, import grouping, `godot` doc-comment rule, no package-level mutable state.
- **Frontend conventions**: `@/` absolute imports, Biome formatting parameters (2-space indent, double quotes, semicolons, 140-char line width), React Query for server data, `cn()` + CVA, Radix/base-ui reuse, generated proto exclusion.
- **Database and proto rules**: three-driver migration requirement, `LATEST.sql` update, fresh-install equivalence, backward compat for proto fields, regeneration after proto edits.
- **Verification policy**: narrowest checks while iterating, match change routing before finishing, docs-only exception, report when check cannot run locally.
- **CI reference**: Go 1.27.0, golangci-lint v2.13.1, test matrix, Node 24, pnpm 11.0.1, buf checks, Docker Alpine 3.21 multi-arch.
- **Working rules**: read before editing, scoped diffs, no hand-editing generated proto, ask before heavy changes.

---

## In Candidate Only

Topics present in the candidate but not explicitly listed in the existing AGENTS.md:

- **`server/router/mcp/`** added to the code map with description "MCP server (AI agent tool access)".
- **`internal/ai/`** added to the code map with description "OpenAI + Gemini integration, STT, audio".
- **`internal/filter/`** added to the code map with description "CEL memo filter evaluation".
- **`internal/markdown/`** added to the code map with description "Server-side Markdown parsing".
- **`internal/idp/`** added to the code map with description "OIDC/OAuth2 IdP client".
- **`internal/storage/`** added to the code map with description "S3 + local storage abstraction".
- **`internal/scheduler/`** added to the code map with description "Cron-like task scheduler".
- **`internal/webhook/`** added to the code map with description "Outbound webhook dispatch".
- Explicit note that `proto/api/v1/` contains "11 services".
- Demo mode description: fixed JWT secret used when `--demo` is set.

---

## In Existing Only

Topics in the existing AGENTS.md not reflected in the candidate (these represent human-authored context):

- The existing file opens with a human-readable framing statement: *"Keep this file short, concrete, and tied to commands that actually work in this repo. If a fact here conflicts with source files or CI config, trust the source file and update this guide."* — This meta-instruction about how to treat the file itself is not present in the candidate.
- The existing file's Working Rules section uses a slightly different phrasing emphasis: *"Do not do repo-wide cleanup, dependency churn, or generated-file rewrites unless the task requires it"* — the candidate conveys the same intent but with slightly different wording.

---

## Recommendation

**AGENTS.md is accurate — no changes needed.**

The existing AGENTS.md is accurate and complete. The only candidate additions are supplementary code-map entries for packages that do exist in the codebase (`internal/ai/`, `internal/filter/`, `internal/markdown/`, `internal/storage/`, `internal/scheduler/`, `internal/webhook/`, `internal/idp/`, `server/router/mcp/`). If desired, those entries could be appended to the Code Map section of AGENTS.md as a non-breaking enrichment, but it is not required.
