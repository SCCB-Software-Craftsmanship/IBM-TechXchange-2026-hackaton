# GLOSSARY.md

Domain-specific terms, identifiers, enums, and concepts that appear repeatedly throughout the Memos codebase.

---

## Core Domain Entities

### Memo
The fundamental note unit in Memos. A memo has Markdown `content`, a `visibility`, timestamps, optional attachments, reactions, comments, and relations. Identified by resource name `memos/{id}`. Stored in the `memo` table.

### Attachment
A file uploaded by a user (image, video, audio, document, etc.) that can be linked to a memo. Stored either locally or in an S3-compatible object store. Identified by `attachments/{id}`. Previously called "resource" in older API versions.

### User
An account in a Memos instance. Has a `username`, `email`, `role`, and `row_status`. Identified by `users/{username}`.

### Space
A workspace or group context for memos. Memos with `SPACE` visibility are readable only by space members. Identified by `spaces/{id}`.

### Inbox
A notification inbox per user. Messages arrive from reactions, comments, and mentions. Identified by `users/{user}/inbox/{inbox}`.

### Reaction
An emoji reaction attached to a memo. `reaction_type` is a free-form emoji string (e.g., `"👍"`, `"❤️"`). Identified by `memos/{memo}/reactions/{reaction}`.

### Webhook
An outbound HTTP POST triggered by memo create/update/delete events. Configured per-user. Outbound requests to private-network addresses are blocked unless explicitly allowed.

### Personal Access Token (PAT)
A long-lived authentication token scoped to a single user. Presented as a `Bearer` token in the `Authorization` header. Stored as a bcrypt hash in the database.

### Identity Provider (IdP)
An external OIDC/OAuth2 SSO configuration. Allows users to sign in via third-party services. Managed via `IdentityProviderService`.

---

## Enumerations

### `Visibility` (`proto/api/v1/memo_service.proto`)
Controls who can read a memo.

| Value | Meaning |
|---|---|
| `VISIBILITY_UNSPECIFIED` | Default/unset |
| `PRIVATE` | Only the creator can read |
| `PROTECTED` | Any signed-in instance member can read |
| `PUBLIC` | Signed-in users can read; anonymous visitors can read when instance policy permits |
| `SPACE` | Only active members of the memo's space can read |

### `InstanceAccessMode` (`proto/api/v1/instance_service.proto`, `proto/store/instance_setting.proto`)
Controls whether unauthenticated users may access instance content.

| Value | Meaning |
|---|---|
| `INSTANCE_ACCESS_MODE_UNSPECIFIED` | Default |
| `INSTANCE_ACCESS_MODE_PRIVATE` | Unauthenticated access is blocked |
| `INSTANCE_ACCESS_MODE_PUBLIC` | Unauthenticated users can read PUBLIC memos |

### `User.Role` (`proto/api/v1/user_service.proto`)
User permission level within the instance.

| Value | Meaning |
|---|---|
| `ROLE_UNSPECIFIED` | Default/unset |
| `HOST` | Instance administrator (first user) |
| `ADMIN` | Administrative user |
| `USER` | Regular user |

### `Space.Role` (`proto/api/v1/space_service.proto`)
User permission level within a space.

| Value | Meaning |
|---|---|
| `ROLE_UNSPECIFIED` | Default/unset |
| `OWNER` | Space owner |
| `ADMIN` | Space admin |
| `MEMBER` | Regular member |

### `RowStatus` (store layer)
Soft-delete status for database rows. Used on users, memos, and identity providers.

| Value | Meaning |
|---|---|
| `NORMAL` | Active record |
| `ARCHIVED` | Soft-deleted / archived |

### `StorageType` (instance setting)
Where attachments are stored.

| Value | Meaning |
|---|---|
| `STORAGE_TYPE_UNSPECIFIED` | Default |
| `STORAGE_TYPE_LOCAL` | Local disk |
| `STORAGE_TYPE_S3` | S3-compatible object storage |

### `AttachmentStorageType` (`proto/store/attachment.proto`)
Storage backend for a specific attachment. Mirrors `StorageType` at the record level.

---

## Memo Relations

### `MemoRelation`
A typed link between two memos.

| Type | Meaning |
|---|---|
| `MEMO_RELATION_TYPE_UNSPECIFIED` | Default |
| `REFERENCE` | One memo references another |
| `COMMENT` | One memo is a comment on another |

---

## Resource Name Conventions

Memos uses Google AIP-style resource names throughout the API.

| Resource | Name format |
|---|---|
| User | `users/{username}` |
| User setting | `users/{user}/settings/{setting}` |
| User access token | `users/{user}/accessTokens/{access_token}` |
| Memo | `memos/{id}` |
| Memo attachment | `memos/{memo}/attachments/{attachment}` |
| Memo reaction | `memos/{memo}/reactions/{reaction}` |
| Attachment | `attachments/{id}` |
| Space | `spaces/{id}` |
| Identity provider | `identityProviders/{id}` |
| Inbox | `users/{user}/inbox/{inbox}` |
| Webhook | `users/{user}/webhooks/{webhook}` |

---

## Authentication Terms

| Term | Meaning |
|---|---|
| **Access token** | Short-lived JWT issued on sign-in. Sent in `Authorization: Bearer` header. |
| **Access token v2** | Updated JWT format with embedded `role` and `row_status` claims. |
| **Refresh token** | Long-lived JWT stored as an HTTP-only cookie. Used to obtain new access tokens without re-login. |
| **PAT** | Personal Access Token — long-lived bearer token for programmatic API access. |
| **Secret** | Per-instance HMAC key used to sign JWTs. Set to a fixed value in demo mode. |

---

## Infrastructure / System Terms

| Term | Meaning |
|---|---|
| **DBDriver** | Interface (`store/driver.go`) implemented by SQLite, MySQL, and PostgreSQL packages. |
| **Store** | Central Go struct (`store/store.go`) that wraps a `DBDriver` and exposes all entity operations. |
| **Migrator** | Component (`store/migrator.go`) that runs versioned SQL migration files on startup. |
| **SSEHub** | Server-Sent Events hub (`server/router/api/v1/sse_hub.go`) for broadcasting real-time inbox events to connected clients. |
| **Profile** | Runtime configuration struct (`internal/profile/`) populated from CLI flags and env vars. |
| **Demo mode** | Special operating mode (`--demo`) that uses a fixed JWT secret and seeds demo data. |
| **CEL** | Common Expression Language — used for server-side memo filter evaluation (`internal/filter/`). |
| **MCP** | Model Context Protocol — an open protocol for AI-agent tool calling; exposed at `/mcp`. |
| **Connect RPC** | Buf's protocol for RPC that works over both HTTP/1.1 and HTTP/2. Used for all API services. |
| **gRPC-Gateway** | Generates REST/JSON HTTP endpoints from gRPC service definitions. Mounted at `/api/v1/`. |
| **buf** | Build tool for Protocol Buffers: generates code, lints, and formats `.proto` files. |

---

## Frontend Terms

| Term | Meaning |
|---|---|
| **`cn()`** | Utility function combining `clsx` and `tailwind-merge` for conditional class name merging. |
| **CVA** | `class-variance-authority` — used to define component style variants. |
| **React Query** | Data-fetching and caching library (`@tanstack/react-query`). All server state flows through it. |
| **Connect client** | TypeScript RPC client generated from proto files and configured in `web/src/connect.ts`. |
| **OKLch** | Color space used for CSS theme tokens in `web/src/themes/`. |
| **`@/`** | Absolute import alias resolving to `web/src/`. |
| **Memo filter** | Client-side filter state managed via `useMemoFilters` hook; serialized as a CEL expression sent to the server. |
| **Activity Calendar** | UI component showing per-day memo creation activity (heatmap). |
| **TagTree** | Hierarchical tag browser in the sidebar, derived from `#tag` patterns in memo content. |
| **`RowStatus`** | Go-layer concept surfaced in JWT claims and user objects; values: `normal`, `archived`. |
