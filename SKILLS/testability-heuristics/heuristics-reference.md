# Heuristics Reference

> **This is a universal, framework-agnostic reference.**
> It is **not** read directly during diff analysis.
> The `testability-heuristics` skill uses it as a base to generate `.bob/HEURISTICS.md`,
> which is the file that `testability-prep` reads. Every description, signal, and fix in
> this file is intentionally abstract — no language keywords, no framework names, no
> concrete API calls. Concretization happens at skill-invocation time using the project
> context gathered from `analyze-codebase` outputs.

---

## How to use this reference

This file is consumed by the `testability-heuristics` skill (Sub-task 2 of the skill
authoring pipeline). When that skill runs:

1. It reads this file in full.
2. For each barrier A1–A9, it applies the **Adaptation hint** row together with the
   gathered project context (`TESTING.md`, `CONVENTIONS.md`, `DEPENDENCIES.md`,
   `ARCHITECTURE.md`) to rewrite the Description, Signal, and Minimum fix rows using
   concrete project-specific terms.
3. It omits barriers that have no plausible signal in the project, listing them in a
   "Skipped barriers" section with a one-line reason.
4. It writes the result to `.bob/HEURISTICS.md` — without the Adaptation hint rows.

Do not skip this translation step. Applying abstract barrier descriptions directly to a
diff produces false positives and misses project-specific manifestations.

---

## Barrier A1 — Unstable or missing observable locator

| | |
|---|---|
| **Description** | A new or changed interactive or observable element in the output layer has no stable, test-addressable identifier. The element can only be located by its position, generated content, or volatile rendering detail — all of which change without notice. |
| **Signal** | A new interactive or presentational element is added to the output layer with no accessible semantic label (role, visible text) and no explicit test identifier attribute. The element's only distinguishing quality is its position in the rendered tree or a dynamically generated value. |
| **Minimum fix** | Add the project's established test identifier attribute to the element, following the convention already in use across the codebase. If no convention exists, introduce the simplest stable identifier that uniquely scopes the element to its feature context. Add only what is missing — never add a second identifier attribute when one already exists. |
| **Do NOT do** | Add multiple competing identifier attributes to the same element. Wrap the element in a new component solely to expose it. Rename or restructure existing elements beyond adding the identifier. Introduce a new identifier convention when the project already has one. |
| **Blocked test (example)** | An end-to-end test that interacts with the element — impossible without a stable locator when no accessible label or stable identifier is present. |
| **Adaptation hint** | Replace "test identifier attribute" with the specific attribute convention the project uses (found in `CONVENTIONS.md` or inferred from existing test files, e.g. `data-testid`, `data-cy`, `aria-label`). Replace "output layer" with the project's rendering technology (e.g. "React component", "Django template", "HTML partial"). |

---

## Barrier A2 — Uncontrollable time or non-deterministic value source

| | |
|---|---|
| **Description** | New logic calls a time source, sequence generator, or non-deterministic value producer directly inside the unit body. The value used is invisible to the caller and cannot be controlled or observed by a test, making correctness assertions on time- or identity-sensitive behavior impossible. |
| **Signal** | A new function or branch whose correctness depends on the current instant or a generated unique value, where the source is called as a direct expression inside the function body with no way to substitute a known value. |
| **Minimum fix** | Accept the time source or value generator as an optional parameter with the real source as the default. One extra parameter only — no new type, no new interface, no structural change to the call site unless the call site already passes dependencies that way. |
| **Do NOT do** | Introduce a provider type, a clock interface, a strategy object, or any dependency injection mechanism unless the codebase already uses that exact pattern for this purpose. Split the function. Rename the function. Extract a secondary function just to hold the call. |
| **Blocked test (example)** | A unit test that verifies the unit produces the correct output for a known reference instant or value — impossible when the source is hard-coded inside the function body. |
| **Adaptation hint** | Replace "time source" with the specific call used in the project (e.g. `time.Now()`, `Date.now()`, `datetime.now()`). Replace "value generator" with the project's identity or randomness source (e.g. `uuid()`, `crypto.randomUUID()`, `rand.Int()`). Replace "optional parameter" with the idiomatic optional-argument pattern for the project's language (variadic, default argument, nil-check, etc.). |

---

## Barrier A3 — Coupled I/O boundary

| | |
|---|---|
| **Description** | New business logic is directly coupled to a real external resource — a network service, a data store, or the file system — initiated inside the function body. The unit's observable output depends entirely on the response of that resource, making it impossible to assert correct behavior for a given response without operating the real resource. |
| **Signal** | A new or changed function whose return value or side effect depends on the result of an I/O call initiated inside the function body, where no mechanism exists to substitute a controlled response. |
| **Minimum fix** | Accept the I/O boundary as a parameter — a function value, a thin callable, or (only if the codebase already uses constructor injection for this purpose) a constructor field. Use the simplest type the existing call site already accepts. The default value must be the real I/O client so call sites require no change. |
| **Do NOT do** | Introduce a repository pattern, a service layer, an interface hierarchy, or any architectural restructuring beyond the single parameter needed to make the boundary substitutable. Do not add a mock or stub to production code. |
| **Blocked test (example)** | A unit test that verifies the function returns the correct result for a controlled response (e.g. empty result, error, specific payload) — impossible without being able to substitute the I/O boundary. |
| **Adaptation hint** | Replace "I/O call" and "the I/O client" with the specific client or call the project uses (e.g. `db.query`, `axios.get`, `fetch`, `os.ReadFile`, `requests.get`), found in `DEPENDENCIES.md` or the diff itself. Replace "constructor injection" with the dependency injection style already used in the project (found in `ARCHITECTURE.md`). |

---

## Barrier A4 — Missing deterministic fixture or test data

| | |
|---|---|
| **Description** | New behavior depends on a named external data artifact — a seed record, a configuration entry, a static file, or a fixture — that does not exist in the test environment. The test either fails non-deterministically, requires manual environment setup, or is silently skipped because the precondition is never met. |
| **Signal** | A new code path reads a named record, a configuration key, or a file path that is not present in any existing test fixture, seed script, or test configuration file tracked in the repository. |
| **Minimum fix** | Add the minimum fixture entry needed by the new path — the single seed row, configuration key, or file content the new behavior requires. Match the format and location of adjacent entries exactly. Do not rewrite the seeding strategy or change the fixture format. |
| **Do NOT do** | Rewrite the seeding strategy. Change the fixture format. Abstract the data layer to avoid needing a fixture. Add test data to the production database or configuration. |
| **Blocked test (example)** | A unit or integration test for the new code path — fails with a missing-key or not-found error without the fixture entry. |
| **Adaptation hint** | Replace "configuration key", "seed record", and "fixture" with the specific data artifacts the project uses (e.g. `config["feature_flags"]["x"]`, a factory-created record in the test database, a JSON fixture file under `testdata/`), found by inspecting the project's test helpers in `TESTING.md` and existing test files. |

---

## Barrier A5 — Missing or mismatched behavioral contract

| | |
|---|---|
| **Description** | A new or changed externally-visible behavior — an endpoint, an event, a message, a public API — has no corresponding entry in the repository's contract definition. Contract tests, generated clients, or downstream consumers cannot be written or updated because the expected shape has never been formally described. |
| **Signal** | A new handler, emitter, or producer is added whose input/output shape has no matching entry in any contract definition file tracked in the repository. |
| **Minimum fix** | Add the minimum schema entry that describes the new behavior — the path and operation for a REST endpoint, the message type and fields for an event or message schema. Match the style and level of detail of adjacent entries in the same contract file. Do not introduce a new contract format. |
| **Do NOT do** | Refactor the entire contract file. Add client-side type definitions (those belong to test generation, not testability prep). Change the contract format or tooling. Add entries for behaviors that already have definitions. |
| **Blocked test (example)** | A contract test that validates the shape of the new behavior's output — cannot be generated without a schema definition. |
| **Adaptation hint** | Replace "contract definition file" with the specific file and format the project uses (e.g. `openapi.yaml`, a `.proto` file, a JSON Schema file, an AsyncAPI spec), found in `ARCHITECTURE.md` or by searching the repository. Replace "handler/emitter/producer" with the project-specific terms. |

---

## Barrier A6 — Uncontrollable async boundary

| | |
|---|---|
| **Description** | A deferred or concurrent operation is initiated inside the unit body, but the mechanism that schedules, resolves, or completes it is not accessible to the caller. A test cannot await completion deterministically, inject a controlled outcome, or cancel the operation — making assertions on the operation's effects timing-dependent and flaky. |
| **Signal** | A new function or method fires a deferred operation (a scheduled callback, a background worker, a fire-and-forget call, a timer-based trigger) and returns before the operation completes, with no handle, cancellation token, or completion signal available to the caller. |
| **Minimum fix** | Return a completion handle (a promise, a future, a channel, a done signal) or accept a completion callback as an optional parameter so a test can await or synchronize with the operation. If the operation is timer-driven, apply Barrier A2's fix first (injectable time source) so the timer can be controlled. |
| **Do NOT do** | Introduce a background worker framework, a queue, or an event bus solely to make the operation observable. Add polling or sleep calls inside tests. Hard-code synchronization delays in production code. |
| **Blocked test (example)** | A unit test that asserts the operation's side effect occurred after the triggering call — impossible without a deterministic completion signal. |
| **Adaptation hint** | Replace "completion handle" with the idiomatic async primitive the project uses (e.g. `Promise`, `Future`, channel, `async/await`, `WaitGroup`), found in `TESTING.md` and existing async code in the diff. Replace "timer-driven" with the specific scheduling mechanism used (e.g. `setTimeout`, `time.AfterFunc`, `celery.delay`). |

---

## Barrier A7 — Global or singleton state mutation

| | |
|---|---|
| **Description** | The tested unit writes to mutable state that lives at module, process, or singleton scope. Because this state persists across test executions, the outcome of one test affects subsequent tests, making the suite order-dependent and individual tests non-isolatable. |
| **Signal** | A new code path assigns to, appends to, or mutates a variable, registry, cache, or counter that is declared at module or process scope and is not reset between test runs by any existing teardown mechanism. |
| **Minimum fix** | Either (a) pass the state container as a parameter (same pattern as Barrier A3) so each test can supply an isolated instance, or (b) expose a reset or clear function that test teardown can call — whichever is the smaller change. If the state is an append-only registry, ensure entries added during a test are removed in teardown. |
| **Do NOT do** | Introduce a global state management library. Redesign the module to avoid global state entirely. Add test-only conditionals that skip state mutation in test environments. |
| **Blocked test (example)** | Any unit test that relies on the initial value of the shared state — fails or produces wrong results when run after a test that mutates it. |
| **Adaptation hint** | Replace "module scope" with the language-specific concept (e.g. package-level variable in Go, module-level variable in Python, closure variable in Node.js, static field in Java). Replace "reset or clear function" with the idiomatic teardown pattern the project already uses (found in `TESTING.md`, e.g. `afterEach`, `defer`, `addCleanup`). |

---

## Barrier A8 — Environment or configuration coupling

| | |
|---|---|
| **Description** | New behavior branches on a value read directly from the process environment or from a global configuration object that is populated once at startup. There is no override path for tests to supply a known value, so the behavior exercised by a test depends on whatever the CI environment or local machine happens to have set. |
| **Signal** | A new conditional branch or default value is derived from a direct read of the process environment or a global config accessor, with no parameter, option, or override mechanism available to callers. |
| **Minimum fix** | Accept the configuration value as a parameter with the environment/config read as the default — one extra parameter, same pattern as Barrier A2. Alternatively, if the project already has a configuration injection pattern (e.g. a config struct passed to a constructor), route the value through that existing path instead of reading the environment directly. |
| **Do NOT do** | Create a configuration abstraction layer. Introduce a settings object or a configuration provider type unless the codebase already uses one. Modify the environment inside a test (that leaks to other tests). |
| **Blocked test (example)** | A unit test that verifies behavior for a specific configuration value — impossible without being able to supply that value without modifying the real environment. |
| **Adaptation hint** | Replace "process environment" with the project's specific mechanism (e.g. `os.Getenv`, `process.env`, `os.environ`, `System.getenv`). Replace "global config accessor" with the project's actual config object (found in `ARCHITECTURE.md` or `CONVENTIONS.md`). Replace "configuration injection pattern" with the project's existing approach if one exists. |

---

## Barrier A9 — Opaque initialization side effect

| | |
|---|---|
| **Description** | The module or object performs observable side effects — registrations, I/O calls, cache population, global state mutation — at load or construction time, before any test can establish preconditions. These effects cannot be suppressed, deferred, or observed in isolation, so every test that imports or instantiates the unit inherits an uncontrolled initial state. |
| **Signal** | A new module-level statement or constructor body performs a side-effectful operation (registers a handler, opens a connection, writes to a global registry, starts a background process) that executes unconditionally at import or instantiation time, with no flag or option to suppress or defer it. |
| **Minimum fix** | Move the side effect into an explicit initialization function that the caller invokes after construction, or guard it behind a parameter/option that defaults to the production behavior but can be suppressed in tests. The change must be limited to deferring or conditionally suppressing the specific side effect — do not restructure the module. |
| **Do NOT do** | Convert the module to a class solely to add a constructor option. Introduce a lazy-loading framework. Move the side effect to a global setup that all tests must call. Add test-only environment checks inside the production initialization path. |
| **Blocked test (example)** | A unit test that imports or instantiates the module to test its primary logic — the side effect fires unconditionally and contaminates the test environment before the test body runs. |
| **Adaptation hint** | Replace "module-level statement" with the language-specific concept (e.g. `init()` in Go, module-level code in Python, top-level statement in a Node.js module, static initializer in Java/Kotlin). Replace "explicit initialization function" with the idiomatic late-initialization pattern for the project's language (found by inspecting existing module patterns in the diff or `ARCHITECTURE.md`). |

---

## Quick-reference decision table

| Barrier present? | Concrete blocked test named? | Action |
|---|---|---|
| Yes | Yes | Adapt using Adaptation hint → apply minimum fix → commit → include in PR |
| Yes | No | Discard — cannot justify the change |
| No | — | No action |

When in doubt, discard. A change that ships without justification makes the codebase harder to
reason about for no gain.
