# CONVENTIONS.md

## Go Conventions

### Error Handling

- **Always** wrap errors with `errors.Wrap(err, "context message")` from `github.com/pkg/errors`.
- **Never** use `fmt.Errorf` — it is forbidden by golangci-lint (`forbidigo` rule).
- Return service-layer errors using `status.Errorf(codes.X, "message")` from `google.golang.org/grpc/status`.

### Import Grouping

Group imports in three blocks, separated by blank lines:
1. Standard library
2. Third-party packages
3. `github.com/usememos/memos` internal packages

`goimports` (run by golangci-lint) enforces this automatically. The `local-prefixes` setting in `.golangci.yaml` is set to `github.com/usememos/memos`.

### Doc Comments

- Add doc comments for all exported identifiers.
- Comments must end with a period (`godot` linter enforces this).

### Package-Level State

- Avoid package-level mutable variables unless the surrounding package already uses that pattern.

### Linting

Configuration: `.golangci.yaml` (golangci-lint v2, version 2 schema).

Enabled linters:
| Linter | Purpose |
|---|---|
| `revive` | General Go linting (all rules enabled except those explicitly disabled) |
| `govet` | Vet checks (all enabled except `fieldalignment` and `shadow`) |
| `staticcheck` | Static analysis (`all` minus ST1000, ST1003, ST1021, QF1003) |
| `misspell` | Spelling corrections |
| `gocritic` | Code critic (ifElseChain disabled) |
| `sqlclosecheck` | Ensures `sql.Rows`/`sql.Stmt` are closed |
| `rowserrcheck` | `rows.Err()` must be checked |
| `nilerr` | Detects incorrect nil returns in error handling |
| `godot` | Enforces periods at end of exported doc comments |
| `forbidigo` | Forbids `fmt.Errorf` and `ioutil.ReadDir` |
| `mirror` | Detects calls that can use a more efficient mirror function |
| `bodyclose` | Ensures HTTP response bodies are closed |
| `goimports` | Import grouping and formatting (formatter) |

`errcheck` is explicitly disabled (the project checks errors manually where relevant).

Revive rules explicitly disabled (too strict for this project):
`file-header`, `line-length-limit`, `function-length`, `max-public-structs`, `function-result-limit`, `banned-characters`, `argument-limit`, `cognitive-complexity`, `cyclomatic`, `confusing-results`, `add-constant`, `flag-parameter`, `nested-structs`, `import-shadowing`, `early-return`, `use-any`, `exported`, `unhandled-error`, `if-return`, `max-control-nesting`, `redefines-builtin-id`, `package-comments`

---

## Frontend Conventions

### Imports

- Use `@/` for all absolute imports within `web/src/`. Configured in `tsconfig.json` paths.
- Biome's `organizeImports` assist action is enabled — imports are auto-sorted.
- Prefer named imports; avoid default re-exports that shadow names.

### Formatting (Biome)

Config: `web/biome.json` (Biome v2, schema 2.3.5).

| Setting | Value |
|---|---|
| Indent style | spaces |
| Indent width | 2 |
| Line ending | LF |
| Line width | 140 characters |
| Semicolons | always |
| Quote style (JS/JSX) | double |
| JSX quotes | double |
| Trailing commas | all |
| Arrow parentheses | always |
| Bracket spacing | true |
| Bracket same line | false |

### TypeScript

Config: `web/tsconfig.json`. Key settings:
- `strict: true` — all strict mode checks enabled.
- `noUnusedLocals: true` and `noUnusedParameters: true`.
- `isolatedModules: true`.
- `moduleResolution: "Bundler"` (Vite-compatible).
- `noEmit: true` (type checking only; Vite handles transpilation).

### Linting Rules (Biome)

- `noExplicitAny: "error"` — explicit `any` is not allowed.
- `noVar: "error"` — use `const` or `let`.
- `useConst: "error"` — prefer `const` over `let` where possible.
- `noCommonJs: "error"` — ES modules only.
- `noNamespace: "error"` — TypeScript namespaces not allowed.
- No `<script>` tags. No `debugger` statements.

### Component Patterns

- Use Tailwind CSS v4 utility classes for all styling.
- Merge classes with `cn()` (from `tailwind-merge` + `clsx`).
- Use CVA (`class-variance-authority`) for component variants.
- Reuse Radix primitives from `@base-ui/react` and existing components before introducing new UI primitives.
- All server data fetching must go through React Query hooks in `web/src/hooks/`.
- UI-only state belongs in React contexts (`web/src/contexts/`) or component `useState`/`useReducer`.

### Generated Code

- `web/src/types/proto/` contains generated TypeScript types from Protocol Buffers.
- **Do not** edit files under `web/src/types/proto/` manually.
- **Do not** run Biome on `web/src/types/proto/` — it is excluded in `biome.json`.

---

## Database Conventions

- All schema changes must include migration files for **all three** database drivers: SQLite, MySQL, and PostgreSQL.
- Each driver has a `LATEST.sql` representing the full schema for a fresh install.
- Incremental migrations under `store/migration/{sqlite,mysql,postgres}/` must stay equivalent to the cumulative `LATEST.sql`.
- Use raw SQL — no ORM. Follow the query patterns established in existing driver files.

---

## Protocol Buffer Conventions

- API contracts are defined in `proto/api/v1/*.proto` files.
- Internal storage messages are in `proto/store/*.proto`.
- **Never** hand-edit files in `proto/gen/` or `web/src/types/proto/`.
- After editing `.proto` files: run `cd proto && buf generate` to regenerate all outputs.
- Run `cd proto && buf lint` and `cd proto && buf format -w` before committing.
- Preserve backward compatibility for proto field changes unless a breaking change is explicitly required.

---

## Public API Route Registration

- New unauthenticated (public) API endpoints must be added to `server/router/api/v1/acl_config.go`.
- All other endpoints require authentication enforced by Connect interceptors.

---

## CI/CD Conventions

### Backend

- Go version: **1.27.0** (set in both `go.mod` and CI).
- CI runs `go mod tidy -go=1.27.0 && git diff --exit-code` to verify the module is tidy.
- golangci-lint version: **v2.13.1**.
- Test groups in CI matrix: `store`, `server`, `internal`, `other`.

### Frontend

- CI node version: **24**, pnpm version: **11.0.1**.
- CI runs: `pnpm install --frozen-lockfile` → `pnpm lint` → `pnpm test` → `pnpm build`.

### Commit / Release

- Release process uses `release-please` (config: `release-please-config.json`, manifest: `.release-please-manifest.json`).
- `CHANGELOG.md` is auto-generated.
- Docker images are multi-arch: amd64, arm64, arm/v7.
