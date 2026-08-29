# Seams Reference

This file is a checklist of the five testability barrier types this skill is allowed to fix,
each with an example of the **minimum acceptable fix** and an explicit example of what **not**
to do. Consult this file during Step 3 and Step 4 of the skill process.

---

## How to use this checklist

For each changed section in the diff, go through every row and ask: "does this section exhibit
this barrier?" A section may have zero, one, or more barriers. Only proceed to a fix when the
answer is "yes" **and** a concrete test name can be given for the "Blocked test" field.

---

## Barrier 1 — Unstable or missing UI selector

| | |
|---|---|
| **Description** | The new or changed UI element cannot be located reliably by a test using accessible roles, labels, or visible text alone. |
| **Signal in diff** | A new interactive element (button, input, link) with no accessible label and no existing selector attribute. |
| **Minimum fix** | Add the project's established selector attribute (e.g. `data-testid="submit-order"`) to the element. Use the convention found in `CONVENTIONS.md` or inferred from existing test files — never introduce a second attribute if one already exists. |
| **Do NOT do** | Add both `data-cy` and `data-testid` "just in case". Wrap the element in a new component to expose it. Rename existing elements beyond adding the attribute. |
| **Example — before** | `<button onClick={handleSubmit}>Submit</button>` |
| **Example — after** | `<button data-testid="checkout-submit" onClick={handleSubmit}>Submit</button>` |
| **Blocked test (example)** | "An E2E test that clicks the submit button on the checkout page" — impossible without a stable locator when multiple unlabelled buttons exist. |

---

## Barrier 2 — Uncontrollable clock or randomness

| | |
|---|---|
| **Description** | The new logic calls a clock (`time.Now()`, `Date.now()`, `new Date()`, `uuid()`, etc.) directly and provides no way for a test to control or observe the value used. |
| **Signal in diff** | A new function or branch whose correctness depends on the current time or a generated ID, with the clock/generator called as a direct expression inside the function body. |
| **Minimum fix** | Accept the clock or generator as an **optional parameter with a production default** — one extra parameter, no new interface, no constructor injection unless the call site already uses constructor injection. |
| **Do NOT do** | Introduce a `Clock` interface, a `TimeProvider` struct, a service layer, or a dependency injection framework. Rename the function. Split the function into multiple pieces. |
| **Example — before (Go)** | `func Schedule(job Job) { job.RunAt = time.Now().Add(24 * time.Hour) }` |
| **Example — after (Go)** | `func Schedule(job Job, now ...time.Time) { t := time.Now(); if len(now) > 0 { t = now[0] }; job.RunAt = t.Add(24 * time.Hour) }` |
| **Blocked test (example)** | "A unit test that verifies Schedule sets RunAt to exactly 24 hours from a known reference time" — impossible when `time.Now()` is hard-coded. |

---

## Barrier 3 — Coupled I/O boundary

| | |
|---|---|
| **Description** | New business logic is directly coupled to a real network call, database query, or filesystem read/write, with no way to substitute a controlled response in a unit test. |
| **Signal in diff** | A new or changed function whose observable output depends on the response of an I/O call that is initiated inside the function body (not passed in). |
| **Minimum fix** | Accept the I/O boundary as a parameter (function argument or, if the call site already passes dependencies via a constructor, a constructor field). Use the simplest type the call site already accepts — a plain function value is preferred over an interface when the repository does not already use interfaces for this purpose. |
| **Do NOT do** | Introduce a Repository pattern, a Service layer, a hexagonal architecture refactor, or any change beyond the single parameter needed to make the boundary substitutable. |
| **Example — before (TS)** | `async function getUser(id: string) { return db.query('SELECT * FROM users WHERE id = $1', [id]); }` |
| **Example — after (TS)** | `async function getUser(id: string, query = db.query.bind(db)) { return query('SELECT * FROM users WHERE id = $1', [id]); }` |
| **Blocked test (example)** | "A unit test that verifies getUser returns null when no row is found" — impossible without controlling the database response. |

---

## Barrier 4 — Missing deterministic fixture / test data

| | |
|---|---|
| **Description** | The new behavior depends on external data (a seed row, a configuration file, a fixture) that does not exist in the test environment, making a test fail non-deterministically or require manual setup. |
| **Signal in diff** | A new code path that reads a named record, configuration key, or file path that is not present in any existing test fixture or seed script. |
| **Minimum fix** | Add the minimum fixture entry (seed row, fixture file, config key) needed by the new path. Do not generate a full fixture replacement — add only what the new behavior requires. |
| **Do NOT do** | Rewrite the seeding strategy. Change the fixture format. Abstract the data layer to avoid needing a fixture. |
| **Example** | New code reads `config["feature_flags"]["new_checkout"]` → add `"new_checkout": false` to the test config fixture. |
| **Blocked test (example)** | "A unit test for the checkout feature flag branch" — fails with a KeyError/undefined access without the fixture entry. |

---

## Barrier 5 — Missing or mismatched contract (API/schema)

| | |
|---|---|
| **Description** | A new or changed endpoint, event, or message has no corresponding entry in the repository's contract definition (OpenAPI schema, Protobuf definition, JSON schema, event catalog, etc.), preventing a contract test from being written or a generated client from being updated. |
| **Signal in diff** | A new route handler, event emitter, or message producer whose shape has no matching entry in any `openapi.yaml`, `*.proto`, or schema file tracked in the repository. |
| **Minimum fix** | Add the minimum schema entry (path + operation for REST, message type for Protobuf/events) that describes the new behavior. Match the style and level of detail of adjacent entries — do not introduce a new schema format. |
| **Do NOT do** | Refactor the entire schema file. Add client-side types (those belong to test generation, not testability prep). Change the schema format. |
| **Example** | New `POST /orders` handler added → add a `paths./orders.post` entry to `openapi.yaml` with request/response shape. |
| **Blocked test (example)** | "A contract test that validates the POST /orders response shape" — cannot be generated without a schema definition. |

---

## Quick-reference decision table

| Barrier present? | Concrete blocked test named? | Action |
|---|---|---|
| Yes | Yes | Apply minimum fix → commit → include in PR |
| Yes | No | Discard — cannot justify the change |
| No | — | No action |

When in doubt, discard. A change that ships without justification makes the codebase harder to
reason about for no gain.
