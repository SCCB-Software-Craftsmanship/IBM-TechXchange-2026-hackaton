# TESTING.md

## Overview

Testing spans four layers: store integration tests, server integration tests, internal unit tests, and frontend unit tests. Backend tests run against real database instances (via TestContainers) or SQLite in-process.

---

## Backend Tests (Go)

### Test Groups and Commands

| Group | Command | What it covers |
|---|---|---|
| `store` | `go test -v ./store/...` | Store facade, all three DB drivers, migrations |
| `server` | `go test -v -race ./server/...` | Echo server, all routers, real server smoke tests |
| `internal` | `go test -v -race ./internal/...` | Internal packages (filter, markdown, AI, scheduler, etc.) |
| `other` | `go test -v -race ./cmd/... ./internal/... ./proto/...` | CLI, proto, other packages |

Full suite: `go test ./...`
Single test: `go test -v -run TestFoo ./pkg/...`

### Race Detector

The `server` and `internal` groups run with `-race` to catch data races. The `store` group skips race detection because of CGO/container overhead.

### Coverage

CI uploads coverage reports to Codecov with per-group flags (`store`, `server`, `internal`, `other`). Locally: add `-coverprofile=coverage.out -covermode=atomic`.

---

### Store Tests

Location: `store/test/` and per-driver files (`store/db/sqlite/`, `store/db/mysql/`, `store/db/postgres/`).

**Multi-driver execution**: The `TestMain` in `store/test/main_test.go` runs all tests against all three drivers sequentially when no `DRIVER` env var is set. CI sets `DRIVER` to run each driver in the matrix.

**TestContainers**: MySQL and PostgreSQL tests spin up real containers using `github.com/testcontainers/testcontainers-go`. MinIO containers are used for S3 storage tests.

Test files cover:
- `memo_test.go`, `memo_filter_test.go`, `memo_access_test.go` — memo CRUD and access
- `user_test.go`, `user_delete_test.go`, `user_identity_test.go`, `user_setting_test.go`
- `attachment_test.go`, `attachment_filter_test.go`, `attachment_delete_test.go`, `attachment_access_test.go`
- `migrator_test.go`, `migrator_upgrade_test.go`, `migrator_stable_upgrade_test.go`, `migrator_guardrail_test.go`
- `space_test.go`, `space_delete_test.go`, `space_parent_lock_test.go`
- `reaction_test.go`, `reaction_policy_test.go`
- `inbox_test.go`, `idp_test.go`, `auth_config_test.go`, `memo_share_test.go`

---

### Server / API Tests

Location: `server/router/api/v1/test/` (integration) and `server/router/api/v1/*_test.go` (unit).

**TestService helper**: Tests use a `NewTestService(t)` helper that boots a real `server.NewServer` instance with an in-memory SQLite database. Each test gets an isolated server instance.

**Pattern**:
```go
ts := NewTestService(t)
defer ts.Cleanup()
user, _ := ts.CreateRegularUser(ctx, "username")
ownerCtx := ts.CreateUserContext(ctx, user.ID)
result, err := ts.Service.CreateMemo(ownerCtx, &apiv1.CreateMemoRequest{...})
```

Integration test files cover:
- `auth_service_test.go`, `auth_test.go` — sign-in, token flows, SSO
- `memo_service_test.go`, `memo_relation_service_test.go`, `memo_attachment_service_test.go`, `memo_share_service_test.go`
- `user_service_test.go`, `user_service_delete_test.go`, `user_service_stats_test.go`, `user_service_pagination_test.go`
- `attachment_service_test.go`, `attachment_service_s3_test.go`
- `instance_service_test.go`, `instance_stats_test.go`
- `authz_test.go` — authorization policy tests
- `sse_handler_test.go`, `personal_access_token_test.go`
- `idp_service_test.go`, `space_service_test.go`

Unit test files cover:
- `acl_config_test.go` — public route exemptions
- `connect_interceptors_test.go` — auth interceptor
- `gateway_route_resolver_test.go`, `gateway_marshaler_test.go`
- `resource_name_test.go`, `user_resource_name_test.go`
- `sso_username_test.go`, `sse_hub_test.go`, `instance_stats_test.go`

**MCP server tests** (`server/router/mcp/*_test.go`): unit tests for adapter, catalog, OpenAPI generation, and input validation.

**Startup test** (`server/test/startup_test.go`): boots the full server and checks all registered routes.

---

### Internal Package Tests

- `internal/filter/` — CEL expression evaluation tests
- `internal/markdown/` — Markdown AST parsing tests
- `internal/scheduler/` — Scheduler timing tests
- `internal/email/` — Email sending tests
- `store/cache/cache_test.go` — Cache correctness

---

## Frontend Tests (JavaScript/TypeScript)

### Runner and Config

- **Vitest** v4 (`vitest.config.*` or Vite config integration).
- **jsdom** environment for DOM simulation.
- **@testing-library/react** for component rendering.
- **@testing-library/jest-dom** for DOM assertions.

### Commands

| Command | Description |
|---|---|
| `cd web && pnpm test` | Run all unit tests once |
| `cd web && pnpm test:watch` | Watch mode |
| `cd web && pnpm test:coverage` | With coverage |
| `cd web && pnpm lint` | TypeScript type-check + Biome lint |

### Test Location

All tests are in `web/tests/` (143+ test files, `.test.ts` and `.test.tsx`).

Key test areas:
- **Editor**: `editor-controller.test.ts`, `editor-keys.test.ts`, `editor-tag-autocomplete.test.ts`, `markdown-manipulation.test.ts`
- **Memo rendering**: `memo-content-paragraph.test.tsx`, `memo-content-link-preview.test.tsx`, `memo-content-list.test.tsx`, `memo-content-security.test.tsx`
- **Navigation / routing**: `memo-action-navigation.test.tsx`, `memo-view-navigation.test.ts`, `auth-redirect.test.ts`, `app-sidebar-routes.test.ts`
- **Queries / data hooks**: `space-queries.test.tsx`, `user-stats-filter-queries.test.tsx`, `query-deduplication.test.tsx`, `live-memo-refresh.test.tsx`
- **UI components**: most component directories have companion test files
- **Utilities**: `tag.test.ts`, `error.test.ts`, `redirect-safety.test.ts`, `gfm-email.test.ts`
- **Markdown extensions**: `remark-tag.test.tsx`, `memo-markdown-extension.test.ts`, `tag-grammar.test.ts`

---

## CI Configuration

### Backend (`.github/workflows/backend-tests.yml`)

```yaml
jobs:
  static-checks:
    - go mod tidy check
    - golangci-lint v2.13.1
  tests:
    matrix: [store, server, internal, other]
    - go test with coverage per group
    - coverage uploaded to Codecov on push to main
```

### Frontend (`.github/workflows/frontend-tests.yml`)

```yaml
jobs:
  lint:
    - pnpm install --frozen-lockfile
    - pnpm lint (tsc + biome)
    - pnpm test (vitest)
  build:
    - pnpm install --frozen-lockfile
    - pnpm build (vite)
```

### Proto (`.github/workflows/proto-linter.yml`)

- `buf lint` and `buf format` check only.

---

## Writing New Tests

### Go

- Add test files adjacent to the code under test, or in `store/test/` for cross-driver store tests.
- For API-layer tests that need a real server, use the `NewTestService(t)` pattern from `server/router/api/v1/test/`.
- Use `github.com/stretchr/testify/require` for fatal assertions and `assert` for non-fatal.
- Use `errors.Wrap` in production code; test error messages with `require.ErrorContains`.

### Frontend

- Create test files under `web/tests/` matching the pattern `<feature-name>.test.ts(x)`.
- Use `@testing-library/react` for component tests; prefer `screen` queries.
- Mock React Query client with a `QueryClient` wrapper when testing hooks.
- Keep tests isolated — no shared mutable state between test cases.
