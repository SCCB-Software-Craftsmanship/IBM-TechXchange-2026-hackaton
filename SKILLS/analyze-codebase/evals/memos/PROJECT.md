# PROJECT.md

## Overview

**Memos** is an open-source, self-hosted note-taking application built for quick capture and personal data ownership. It is Markdown-native, lightweight, and designed to run under your own control with no telemetry.

- **Repository**: `github.com/usememos/memos`
- **License**: MIT
- **Website**: https://usememos.com
- **Live Demo**: https://demo.usememos.com
- **Docker Hub**: `neosmemo/memos`

## Purpose and Goals

- Provide a fast, friction-free note (memo) capture experience via a timeline-first UI.
- Allow users to fully own their data through self-hosting.
- Support multiple deployment targets: Docker, native binary, Kubernetes, or build from source.
- Expose open REST and gRPC APIs for third-party integrations and extensions.

## Key Features

- **Markdown-native editor** with live preview, syntax highlighting, and GFM support.
- **Multiple database backends**: SQLite (default), MySQL, PostgreSQL.
- **REST + gRPC API** (Connect RPC + gRPC-Gateway) for all operations.
- **MCP (Model Context Protocol) server** for AI-agent integrations.
- **AI integrations**: OpenAI-compatible and Google Gemini (audio transcription, LLM).
- **S3-compatible object storage** for attachments (AWS S3, MinIO, etc.).
- **SSO / OIDC identity providers** for authentication federation.
- **Server-Sent Events (SSE)** for real-time inbox notifications.
- **Webhooks** for outbound event notifications.
- **Spaces** for multi-tenant/workspace isolation.
- **Web Clipper** browser extension (Chrome & Firefox).
- **Internationalization**: 40+ locale files.
- **Reactions, comments, and relations** between memos.
- **Map view** for geotagged memos.
- **Activity calendar** and usage statistics.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend language | Go 1.27.0 |
| HTTP framework | Echo v5 |
| API protocol | Connect RPC v1.20 + gRPC-Gateway v2.30 |
| API definition | Protocol Buffers (buf) |
| Auth | JWT (golang-jwt/jwt v5), Personal Access Tokens |
| Database ORM | Raw SQL via `database/sql` |
| Frontend framework | React 19 |
| Frontend language | TypeScript 6 |
| Build tool | Vite 8 |
| CSS | Tailwind CSS v4 |
| State management | React Query v5 |
| Package manager | pnpm 11.0.1 |
| Node version | ≥24 |

## Entry Points

| Path | Description |
|---|---|
| `cmd/memos/main.go` | Cobra CLI, Viper config, server startup and graceful shutdown |
| `server/server.go` | Echo HTTP server construction, middleware, router wiring |
| `web/src/main.tsx` | React app bootstrap |
| `web/src/App.tsx` | Root component, router setup |

## CLI Flags and Environment Variables

All flags are also settable via `MEMOS_<FLAG_UPPER>` environment variables.

| Flag | Default | Description |
|---|---|---|
| `--demo` | false | Enable demo mode (uses fixed secret key) |
| `--addr` | "" | Bind address |
| `--port` | 8081 | HTTP port (Docker image exposes 5230) |
| `--unix-sock` | "" | UNIX socket path (overrides addr/port) |
| `--data` | "" | Data directory |
| `--driver` | sqlite | Database driver: sqlite, mysql, postgres |
| `--dsn` | "" | Database source name |
| `--instance-url` | "" | Canonical external URL |
| `--log-level` | info | Log verbosity: debug, info, warn, error |
| `--webhook-private-network-allowlist` | nil | Allowlisted private webhook destinations |

## Deployment

- **Docker (recommended)**: `docker run -d -p 5230:5230 -v ~/.memos:/var/opt/memos neosmemo/memos:stable`
- **Docker Compose**: `scripts/compose.yaml` provides a minimal single-service compose file.
- **Docker image**: Alpine 3.21 runtime, non-root user, port 5230, multi-arch (amd64/arm64/arm/v7).
- **Native install**: `curl -fsSL .../scripts/install.sh | sh` (macOS 13+ required for native binary).
- **Build from source**: requires Go 1.27+ and Node 24+.

## Related Projects

- **Web Clipper**: https://github.com/usememos/web-clipper (Chrome & Firefox extension)
- **Dotcom / Docs**: https://github.com/usememos/dotcom
