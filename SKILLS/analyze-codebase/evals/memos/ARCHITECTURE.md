# ARCHITECTURE.md

## High-Level Overview

Memos is a full-stack monorepo with a Go backend and a React SPA frontend. The backend exposes a dual-protocol API (Connect RPC + gRPC-Gateway) that the frontend consumes via generated TypeScript clients. All source lives under one repository root, and the production frontend is compiled into the Go binary's embedded filesystem.

```
┌─────────────────────────────────────────────┐
│                  Browser SPA                │
│     React 19 / TypeScript / Tailwind v4     │
│     React Query ← Connect RPC clients       │
└──────────────────────┬──────────────────────┘
                       │ HTTP/1.1 or HTTP/2
                       │ Connect RPC + REST/JSON (gRPC-Gateway)
┌──────────────────────▼──────────────────────┐
│              Echo v5 HTTP Server            │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
│  │ API v1   │  │FileServer │  │ Frontend │ │
│  │(gRPC-GW) │  │(native)   │  │(embedded)│ │
│  └──────────┘  └───────────┘  └──────────┘ │
│  ┌──────────────────────────────────────┐   │
│  │         MCP Server (SSE/HTTP)        │   │
│  └──────────────────────────────────────┘   │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│                Store Layer                  │
│  Driver interface → SQLite / MySQL / Postgres│
│  + Cache layer + Migrations                 │
└─────────────────────────────────────────────┘
```

## Repository Structure

```
memos/
├── cmd/memos/           # Cobra CLI entry point, log setup, server bootstrap
├── server/              # HTTP server wiring and all router implementations
│   ├── server.go        # Echo construction, middleware, router registration
│   ├── auth/            # JWT access tokens, refresh tokens, PAT handling
│   ├── access/          # Access control helpers
│   ├── cors.go          # CORS middleware factory
│   ├── notification/    # Notification dispatch helpers
│   ├── runner/          # Background runner (memo payload rebuild)
│   └── router/
│       ├── api/v1/      # Connect RPC + gRPC-Gateway service implementations
│       ├── fileserver/  # Native HTTP file serving (range requests, thumbnails)
│       ├── frontend/    # Embedded SPA static file serving
│       └── mcp/         # Model Context Protocol server
├── store/               # Store facade, cache, migration runner, driver interface
│   ├── store.go         # Central Store struct; method groupings per entity
│   ├── driver.go        # DBDriver interface (implemented by each DB package)
│   ├── cache/           # In-memory cache for frequently read entities
│   ├── db/
│   │   ├── sqlite/      # SQLite driver + SQL queries + LATEST.sql
│   │   ├── mysql/       # MySQL driver + SQL queries + LATEST.sql
│   │   └── postgres/    # PostgreSQL driver + SQL queries + LATEST.sql
│   ├── migration/       # Versioned SQL migration files per DB driver
│   └── test/            # Integration tests (run against real DB via TestContainers)
├── internal/            # App-private packages (not importable externally)
│   ├── ai/              # AI integration: OpenAI, Gemini, STT, audio
│   ├── base/            # Shared primitives
│   ├── email/           # Email sending
│   ├── filter/          # CEL-based memo filter evaluation
│   ├── httpgetter/       # HTTP fetch utilities
│   ├── idp/             # OIDC / OAuth2 identity provider client
│   ├── markdown/        # Server-side Markdown parsing and AST manipulation
│   ├── motionphoto/     # Motion photo (HEIC/JPEG) extraction
│   ├── profile/         # Runtime profile struct (port, driver, data dir, etc.)
│   ├── scheduler/       # Cron-like task scheduler
│   ├── storage/         # S3 + local storage abstraction
│   ├── testutil/        # Test helper utilities
│   ├── util/            # General-purpose utilities
│   ├── version/         # Version + commit metadata
│   └── webhook/         # Outbound webhook dispatch with private-IP protection
├── proto/               # Protocol Buffer sources
│   ├── api/v1/          # Public API service definitions (11 .proto files)
│   ├── store/           # Internal storage proto messages
│   └── gen/             # Generated Go/OpenAPI outputs (do not edit by hand)
├── web/                 # React SPA
│   └── src/
│       ├── App.tsx           # Root component + router setup
│       ├── main.tsx          # App bootstrap
│       ├── connect.ts        # Connect RPC clients, auth interceptor, token refresh
│       ├── auth-state.ts     # Token storage, BroadcastChannel cross-tab sync
│       ├── components/       # UI components (feature + shared + primitives)
│       ├── hooks/            # React Query data hooks (one file per entity group)
│       ├── contexts/         # React context for UI/client state
│       ├── pages/            # Route-level page components
│       ├── layouts/          # Page layout wrappers
│       ├── router/           # React Router route definitions
│       ├── themes/           # CSS themes (OKLch color tokens)
│       ├── types/proto/      # Generated TypeScript types (do not edit)
│       ├── locales/          # i18n JSON files (40+ languages)
│       ├── lib/              # Small pure-JS utility libraries
│       └── utils/            # Frontend utility functions
├── scripts/             # Docker Compose file, install scripts
└── docs/                # ADRs and other documentation
```

## Backend Architecture

### Request Lifecycle

1. `cmd/memos/main.go` → parse flags/env → create `db.DBDriver` → create `store.Store` → run migrations → `server.NewServer()`.
2. Echo receives an HTTP request and routes it via one of:
   - **gRPC-Gateway handler** (mounted at `/api/v1/`): transcodes REST/JSON ↔ gRPC, calls Connect service handlers.
   - **Connect RPC handler** (mounted on `/memos.api.v1.*`): native Connect/gRPC protocol.
   - **File server** (mounted before gateway): serves attachments via `http.ServeContent` for correct range-request handling.
   - **Frontend handler**: serves the embedded SPA for all unmatched routes.
   - **MCP handler**: SSE-based MCP server at `/mcp`.
3. Service handlers (`server/router/api/v1/`) perform auth checks → call `store.*` methods → return proto responses.

### Auth Flow

- `server/auth/` issues **access tokens** (short-lived JWT) and **refresh tokens** (long-lived JWT stored as HTTP-only cookie).
- **Personal Access Tokens (PATs)** are hashed and stored in the database; presented as `Bearer` in Authorization header.
- `server/router/api/v1/acl_config.go` lists endpoints that bypass authentication.
- Connect interceptors (`connect_interceptors.go`) enforce authentication on every RPC call.

### Store / Database Layer

- `store.Store` is the single facade; each entity has its own Go file (`memo.go`, `user.go`, etc.).
- `store.DBDriver` interface is implemented by three packages: `store/db/sqlite`, `store/db/mysql`, `store/db/postgres`.
- `store/cache/` provides an in-memory cache for user and instance settings.
- Migrations are versioned SQL files under `store/migration/{sqlite,mysql,postgres}/` with a canonical `LATEST.sql` per driver.
- The migrator (`store/migrator.go`) runs all pending migrations on startup.

### Public API Services (proto/api/v1/)

| Proto file | Service | Key operations |
|---|---|---|
| `auth_service.proto` | AuthService | Sign-in, sign-out, SSO, session status |
| `user_service.proto` | UserService | CRUD users, settings, access tokens, stats, webhooks |
| `memo_service.proto` | MemoService | CRUD memos, filtering, relations, reactions, comments |
| `memo_view_service.proto` | MemoViewService | Read-optimised memo list with pagination |
| `attachment_service.proto` | AttachmentService | Upload, list, delete attachments |
| `instance_service.proto` | InstanceService | Instance-wide settings, stats |
| `space_service.proto` | SpaceService | Workspace/space management |
| `idp_service.proto` | IdentityProviderService | OIDC/OAuth2 IdP config |
| `ai_service.proto` | AIService | AI transcription and LLM features |
| `common.proto` | — | Shared types (pagination, visibility, etc.) |

## Frontend Architecture

### Data Flow

```
Connect RPC clients (connect.ts)
       ↓
React Query hooks (hooks/)
       ↓
React components (components/)
       ↓  (mutations)
Connect RPC clients
```

- All server data fetching and caching is handled through React Query hooks in `web/src/hooks/`.
- Client/UI-only state lives in React contexts (`web/src/contexts/`) or component-local state.
- The `@/` alias maps to `web/src/` for all imports.

### Routing

- `react-router-dom` v7 is used for client-side routing.
- Route definitions are centralised in `web/src/router/`.
- Auth-gated routes redirect unauthenticated users to the sign-in page.

### Component Organization

- `web/src/components/ui/` — base UI primitives (buttons, inputs, dialogs).
- `web/src/components/kit/` — small reusable composite components.
- `web/src/components/MemoEditor/` — rich Markdown editor built on CodeMirror 6.
- `web/src/components/MemoContent/` — Markdown renderer pipeline.
- All other component directories are feature-specific.

### Theming

- CSS themes live in `web/src/themes/` using OKLch color tokens.
- Runtime theme switching is managed by a React context.

## MCP Server

`server/router/mcp/` implements a Model Context Protocol server exposed over HTTP-SSE at `/mcp`. It bridges the Connect RPC API surface to MCP tools so AI agents can call Memos operations directly. The `catalog.go` enumerates available tools; `adapter.go` translates MCP calls to internal gRPC calls; `openapi.go` generates an OpenAPI schema for tool discovery.

## Key Design Decisions

- **Single binary deployment**: the React SPA is compiled and embedded into the Go binary via `embed.FS`. `cd web && pnpm release` writes the built SPA to `server/router/frontend/dist/`.
- **No ORM**: all database access is raw SQL for maximum portability across three database engines.
- **Protocol Buffers as source of truth**: API contract is defined in `.proto` files; generated code in `proto/gen/` and `web/src/types/proto/` must never be hand-edited.
- **CEL filter language**: memo list filtering uses Google's Common Expression Language evaluated server-side (`internal/filter/`).
- **Private-network webhook protection**: outbound webhooks block RFC-1918 addresses by default; an allowlist is configurable via `--webhook-private-network-allowlist`.
