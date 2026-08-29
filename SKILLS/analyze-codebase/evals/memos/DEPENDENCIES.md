# DEPENDENCIES.md

## Backend (Go)

### Go Version

Go `1.27.0` (module: `github.com/usememos/memos`, declared in `go.mod`)

### Direct Dependencies

| Package | Version | Purpose |
|---|---|---|
| `connectrpc.com/connect` | v1.20.0 | Connect RPC protocol handler |
| `github.com/labstack/echo/v5` | v5.3.1 | HTTP web framework |
| `github.com/grpc-ecosystem/grpc-gateway/v2` | v2.30.0 | gRPC-to-HTTP/JSON transcoding |
| `google.golang.org/grpc` | v1.83.0 | gRPC runtime |
| `google.golang.org/protobuf` | v1.36.12 | Protocol Buffers serialization |
| `github.com/golang-jwt/jwt/v5` | v5.3.1 | JWT authentication |
| `github.com/google/cel-go` | v0.31.0 | CEL expression evaluation (memo filter language) |
| `modernc.org/sqlite` | v1.56.0 | SQLite driver (pure Go, no CGO) |
| `github.com/go-sql-driver/mysql` | v1.10.0 | MySQL driver |
| `github.com/lib/pq` | v1.12.3 | PostgreSQL driver |
| `github.com/aws/aws-sdk-go-v2` | v1.43.6 | AWS SDK core (S3 storage backend) |
| `github.com/aws/aws-sdk-go-v2/service/s3` | v1.107.2 | S3 object storage operations |
| `github.com/johannesboyne/gofakes3` | v1.2.0 | In-process S3 mock (used in tests) |
| `github.com/disintegration/imaging` | v1.6.2 | Image thumbnail generation |
| `github.com/yuin/goldmark` | v1.8.5 | Markdown parsing (server-side) |
| `github.com/modelcontextprotocol/go-sdk` | v1.7.0 | MCP server SDK |
| `github.com/openai/openai-go/v3` | v3.51.0 | OpenAI API client (AI features) |
| `google.golang.org/genai` | v1.68.0 | Google Gemini AI client |
| `github.com/spf13/cobra` | v1.10.2 | CLI framework |
| `github.com/spf13/viper` | v1.21.0 | Configuration management (flags + env vars) |
| `github.com/joho/godotenv` | v1.5.1 | `.env` file loading |
| `github.com/stretchr/testify` | v1.11.1 | Test assertions |
| `github.com/testcontainers/testcontainers-go` | v0.44.0 | Docker-based integration test containers |
| `github.com/testcontainers/testcontainers-go/modules/mysql` | v0.44.0 | MySQL test container |
| `github.com/testcontainers/testcontainers-go/modules/postgres` | v0.44.0 | PostgreSQL test container |
| `github.com/testcontainers/testcontainers-go/modules/minio` | v0.44.0 | MinIO test container |
| `github.com/google/jsonschema-go` | v0.4.3 | JSON Schema support (MCP/OpenAPI) |
| `github.com/lithammer/shortuuid/v4` | v4.2.0 | Short UUID generation |
| `github.com/pkg/errors` | v0.9.1 | Structured error wrapping (project-mandated) |
| `github.com/at-wat/ebml-go` | v0.19.0 | EBML/WebM media parsing |
| `github.com/pion/opus` | v0.1.0 | Opus audio codec |
| `golang.org/x/crypto` | v0.55.0 | Password hashing (bcrypt) |
| `golang.org/x/oauth2` | v0.36.0 | OAuth2 for SSO/OIDC flows |
| `golang.org/x/sync` | v0.22.0 | Concurrency utilities |
| `gopkg.in/yaml.v3` | v3.0.1 | YAML parsing |
| `github.com/gorilla/websocket` | v1.5.3 | WebSocket support (indirect) |

### Notable Indirect Dependencies

| Package | Purpose |
|---|---|
| `go.opentelemetry.io/otel` v1.45.0 | OpenTelemetry tracing (pulled by AWS SDK) |
| `github.com/moby/moby/api` v1.55.0 | Docker API types (for TestContainers) |
| `github.com/sirupsen/logrus` | Logging (pulled by TestContainers) |
| `github.com/google/uuid` | UUID generation |
| `github.com/antlr4-go/antlr/v4` | ANTLR parser runtime (CEL) |

---

## Frontend (Node / pnpm)

### Runtime Requirements

- **Node**: ≥ 24
- **pnpm**: 11.0.1
- Lock file: `web/pnpm-lock.yaml`

### Production Dependencies

| Package | Version | Purpose |
|---|---|---|
| `react` | ^19.2.6 | UI framework |
| `react-dom` | ^19.2.6 | React DOM renderer |
| `react-router-dom` | ^7.15.0 | Client-side routing |
| `@tanstack/react-query` | ^5.100.9 | Server state management and caching |
| `@connectrpc/connect` | ^2.1.1 | Connect RPC client |
| `@connectrpc/connect-web` | ^2.1.1 | Connect RPC web transport |
| `tailwindcss` | ^4.2.4 | Utility-first CSS framework |
| `@tailwindcss/vite` | ^4.2.4 | Tailwind Vite plugin |
| `tailwind-merge` | ^3.5.0 | Dynamic class merging (`cn()`) |
| `class-variance-authority` | ^0.7.1 | Component variant utility (CVA) |
| `clsx` | ^2.1.1 | Conditional class names |
| `@base-ui/react` | ^1.7.0 | Radix-based headless UI primitives |
| `@codemirror/view` | ^6.43.6 | Memo editor code view |
| `@codemirror/state` | ^6.43.6 | Editor state management |
| `@codemirror/lang-markdown` | ^6.5.0 | Markdown language support for editor |
| `@codemirror/autocomplete` | ^6.20.3 | Editor autocomplete |
| `@codemirror/commands` | ^6.10.4 | Editor keyboard commands |
| `@lezer/markdown` | ^1.6.4 | Lezer Markdown parser |
| `@lezer/highlight` | ^1.2.3 | Syntax highlighting |
| `react-markdown` | ^10.1.0 | Markdown rendering in React |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown |
| `remark-math` | ^6.0.0 | Math expression support |
| `remark-breaks` | ^4.0.0 | Soft-break rendering |
| `rehype-katex` | ^7.0.1 | KaTeX math rendering |
| `rehype-raw` | ^7.0.0 | Raw HTML in Markdown |
| `rehype-sanitize` | ^6.0.0 | HTML sanitization |
| `katex` | ^0.16.45 | Math typesetting |
| `mermaid` | ^11.14.0 | Diagram rendering |
| `highlight.js` | ^11.11.1 | Code block syntax highlighting |
| `mdast-util-from-markdown` | ^2.0.3 | Markdown AST parsing |
| `mdast-util-gfm` | ^3.1.0 | GFM AST utilities |
| `leaflet` | ^1.9.4 | Interactive map (geotagged memos) |
| `react-leaflet` | ^5.0.0 | React bindings for Leaflet |
| `react-leaflet-cluster` | ^4.1.3 | Marker clustering for map |
| `leaflet.markercluster` | ^1.5.3 | Marker cluster plugin |
| `i18next` | ^26.3.6 | Internationalization framework |
| `react-i18next` | ^17.0.11 | React i18n bindings |
| `dayjs` | ^1.11.20 | Date/time formatting |
| `@github/relative-time-element` | ^5.0.0 | Relative time web component |
| `lucide-react` | ^1.34.0 | Icon library |
| `lodash-es` | ^4.18.1 | Utility functions (ESM) |
| `react-hot-toast` | ^2.6.0 | Toast notifications |
| `uuid` | ^11.1.0 | UUID generation |
| `copy-to-clipboard` | ^4.0.2 | Clipboard write utility |
| `html-to-image` | ^1.11.13 | DOM-to-image export |
| `exifr` | ^7.1.3 | EXIF metadata extraction from images |

### Dev Dependencies

| Package | Purpose |
|---|---|
| `vite` ^8.0.11 | Build tool and dev server |
| `typescript` ^7.0.2 | Type checking |
| `@biomejs/biome` ^2.4.14 | Linter and formatter |
| `vitest` ^4.1.5 | Unit test runner |
| `@testing-library/react` ^16.3.2 | React component testing utilities |
| `@testing-library/jest-dom` ^6.9.1 | Custom DOM matchers |
| `@vitejs/plugin-react` ^6.0.1 | React Vite plugin (React Compiler enabled) |
| `@bufbuild/protobuf` ^2.12.0 | Protobuf runtime for generated TS types |
| `babel-plugin-react-compiler` 1.0.0 | React Compiler Babel plugin |
| `jsdom` ^29.1.1 | DOM environment for tests |

---

## Protocol Buffers

- **buf CLI** used for code generation, linting, and formatting.
- Config: `proto/buf.yaml`, `proto/buf.gen.yaml`, `proto/buf.lock`.
- Generates: Go types + gRPC stubs into `proto/gen/`, TypeScript types into `web/src/types/proto/`, OpenAPI spec into `proto/gen/openapi.yaml`.
