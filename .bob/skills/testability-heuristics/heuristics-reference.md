# Heuristics Reference — Reasoning Guide

> **This is a reasoning guide, not a checklist.**
> Do not iterate over it top-to-bottom and apply every section.
> The `testability-heuristics` skill reads it to learn *how to think* about testability,
> then derives barriers bottom-up from what it finds in the project.
> Only barriers with concrete evidence in the project appear in `.bob/HEURISTICS.md`.

---

## How to use this guide

1. Read the project context (`TESTING.md`, `CONVENTIONS.md`, `DEPENDENCIES.md`,
   `ARCHITECTURE.md`) to build a picture of what the project actually does.
2. For each **diagnostic dimension** below, check whether the project context contains
   evidence of that shape of problem.
3. If evidence exists, produce one barrier entry — written in project-specific terms,
   citing the evidence that confirmed it.
4. If no evidence exists for a dimension, produce nothing. Do not list it as skipped.
   Absence is not a finding.

**The output barrier count is determined by the project, not by this document.**
A pure API service with no UI, no async fire-and-forget, and no global state might produce
2 barriers. A React + Node monorepo with background jobs might produce 7. Both are correct.

---

## Diagnostic Dimension 1 — Observability

*Can a test locate and read the output of the changed behavior?*

A barrier exists in this dimension when new output is produced but a test has no stable,
project-consistent way to address it.

### Evidence pattern 1-A: UI layer present, no stable locator convention on new elements

**Look for in project context:**
- A UI framework name in `DEPENDENCIES.md` (React, Vue, Angular, Svelte, Django templates,
  ERB, Jinja, etc.)
- An established selector convention in `CONVENTIONS.md` (e.g. `data-testid`, `data-cy`,
  `aria-label`) **or** its absence (no convention yet)

**Signal in diff:** A new interactive or presentational element is added with no accessible
semantic label (role, visible text) and no test identifier attribute matching the project's
convention. The only way to locate it is by position or generated content.

**Minimum fix shape:** Add the project's established test identifier attribute to the
element. If no convention exists, add the simplest stable identifier that is unique to the
feature. One attribute only — never add a second one alongside an existing identifier.

**Do NOT do:** Add competing identifier attributes "just in case". Wrap the element in a
new component solely to expose it. Rename existing elements beyond adding the attribute.

---

### Evidence pattern 1-B: Backend behavior present, no contract definition file

**Look for in project context:**
- Route handlers, event emitters, or message producers in the diff
- Absence of a contract file in `ARCHITECTURE.md` (no `openapi.yaml`, no `.proto`, no
  AsyncAPI spec, no JSON Schema file tracked in the repository)

**Signal in diff:** A new handler or producer is added whose input/output shape has no
matching entry in any contract file tracked in the repository.

**Minimum fix shape:** Add the minimum schema entry that describes the new behavior —
path + operation for REST, message type + fields for events. Match the style and detail
level of adjacent entries. Do not introduce a new contract format.

**Do NOT do:** Refactor the entire contract file. Add client-side type definitions. Change
the contract format or tooling.

---

## Diagnostic Dimension 2 — Controllability

*Can a test supply a known input or substitute a dependency?*

A barrier exists in this dimension when the behavior under test has a dependency that is
resolved inside the function body, making it impossible for a test to control the outcome.

### Evidence pattern 2-A: I/O client found, used directly inside function bodies

**Look for in project context:**
- An HTTP client, database client, or filesystem API in `DEPENDENCIES.md`
  (e.g. `axios`, `fetch`, `pg`, `mysql2`, `knex`, `prisma`, `fs`, `requests`, `boto3`)

**Signal in diff:** A new or changed function whose return value or side effect depends on
the result of an I/O call initiated inside the function body, with no mechanism to substitute
a controlled response.

**Minimum fix shape:** Accept the I/O client (or the specific method used) as a parameter
with the real client as the default. One parameter only. Use the simplest type the call site
already accepts — a function value is preferred over an interface unless the codebase already
uses interfaces for this.

**Do NOT do:** Introduce a repository pattern, service layer, interface hierarchy, or any
structural change beyond the single parameter.

---

### Evidence pattern 2-B: Time or randomness source used directly inside function bodies

**Look for in project context:**
- A time API or randomness/ID generator in `DEPENDENCIES.md` or inferable from the language
  (e.g. `Date.now`, `new Date()`, `time.Now()`, `datetime.now()`, `uuid()`,
  `crypto.randomUUID()`, `rand.Int()`, `Math.random()`)

**Signal in diff:** A new function or branch whose correctness depends on the current instant
or a generated unique value, where the source is called as a direct expression inside the
function body with no way to substitute a known value.

**Minimum fix shape:** Accept the time source or generator as an optional parameter with the
real source as the default. One parameter only — no new type, no interface, no structural
change unless the call site already passes dependencies that way.

**Do NOT do:** Introduce a clock interface, a TimeProvider type, a strategy object, or any
DI mechanism not already present in the codebase. Split or rename the function.

---

### Evidence pattern 2-C: Async fire-and-forget operations present

**Look for in project context:**
- Timer-based or deferred execution patterns in `DEPENDENCIES.md` or `ARCHITECTURE.md`
  (e.g. `setTimeout`, `setInterval`, `time.AfterFunc`, `celery.delay`, `sidekiq`,
  `BullMQ`, background workers)
- Functions that start work and return before it completes, with no handle exposed

**Signal in diff:** A new function fires a deferred or concurrent operation and returns
before it completes, with no promise, channel, callback, or cancellation token available
to the caller.

**Minimum fix shape:** Return a completion handle (Promise, Future, channel) or accept a
completion callback as an optional parameter. If timer-driven, apply the time-source fix
(Evidence pattern 2-B) first so the timer can be controlled.

**Do NOT do:** Introduce a queue, event bus, or worker framework solely to make the
operation observable. Add polling or sleep calls in tests. Hard-code delays.

---

### Evidence pattern 2-D: Config or environment read directly inside function bodies

**Look for in project context:**
- Direct environment access in `ARCHITECTURE.md` or `CONVENTIONS.md`
  (e.g. `process.env`, `os.Getenv`, `os.environ`, `System.getenv`)
- A global config object populated once at startup, with no injection mechanism

**Signal in diff:** A new conditional branch or default value is derived from a direct read
of the process environment or a global config accessor, with no parameter or override
mechanism available to callers.

**Minimum fix shape:** Accept the config value as an optional parameter with the
environment/config read as the default — one extra parameter, same pattern as 2-B.
If the project already has a config-injection pattern (a config struct, a settings object),
route the value through that existing path.

**Do NOT do:** Create a configuration abstraction layer. Introduce a settings provider type
unless the codebase already has one. Modify the environment inside a test.

---

## Diagnostic Dimension 3 — Isolation

*Does the unit's behavior depend on state it does not own?*

A barrier exists in this dimension when shared state or initialization side effects mean
that one test's execution affects another, or that a test inherits an uncontrolled starting
condition.

### Evidence pattern 3-A: Mutable state at module or process scope

**Look for in project context:**
- Module-level variables, singletons, registries, or caches in the codebase
- Language-specific patterns: package-level variables (Go), module-level variables (Python),
  closure variables (Node.js), static fields (Java/Kotlin)
- Teardown idiom in `TESTING.md` (e.g. `afterEach`, `defer`, `addCleanup`, `t.Cleanup`)

**Signal in diff:** A new code path assigns to, appends to, or mutates a variable, registry,
cache, or counter declared at module or process scope, not reset between tests by any
existing teardown.

**Minimum fix shape:** Either (a) pass the state container as a parameter so each test
supplies an isolated instance, or (b) expose a reset/clear function that test teardown can
call — whichever is the smaller change. Use the teardown idiom already in the project.

**Do NOT do:** Introduce a global state management library. Redesign the module to avoid
global state entirely. Add test-only conditionals that skip mutation in test environments.

---

### Evidence pattern 3-B: Observable side effects at module load or construction time

**Look for in project context:**
- Module-level initialization patterns: `init()` (Go), top-level statements (Node.js/Python),
  static initializers (Java/Kotlin), `__init_subclass__` (Python)
- Side-effectful operations at module scope: handler registration, connection opening,
  cache population, background process startup

**Signal in diff:** A new module-level statement or constructor body performs a side-effectful
operation that executes unconditionally at import or instantiation time, with no option to
suppress or defer it.

**Minimum fix shape:** Move the side effect into an explicit initialization function the
caller invokes after construction, or guard it behind a parameter that defaults to the
production behavior but can be suppressed. Change only the specific side effect — do not
restructure the module.

**Do NOT do:** Convert a module to a class solely to add a constructor option. Introduce a
lazy-loading framework. Move the side effect to a global test setup.

---

### Evidence pattern 3-C: Test behavior depends on data artifacts not in the test environment

**Look for in project context:**
- Test data strategy in `TESTING.md` (factories, seed scripts, fixture files, in-memory DBs)
- Named records, configuration keys, or file paths read by new code paths

**Signal in diff:** A new code path reads a named record, configuration key, or file path
that is not present in any existing test fixture, seed script, or test configuration file
tracked in the repository.

**Minimum fix shape:** Add the minimum fixture entry — the single seed row, config key, or
file content the new behavior requires. Match the format and location of adjacent entries
exactly. Add only what the new path needs.

**Do NOT do:** Rewrite the seeding strategy. Change the fixture format. Abstract the data
layer to avoid needing a fixture.

---

## Diagnostic Dimension 4 — Determinism

*Does the unit produce the same output for the same input on every run?*

This dimension overlaps with Controllability (2-B) and Isolation (3-A). Check it
separately only when a source of non-determinism is present that is not already covered
by an evidence pattern above.

**Look for in project context:**
- Any dependency on external state that is not injected and not reset between tests
- Any call whose return value changes between invocations for the same input

If a non-determinism source is found that does not match 2-B (time/randomness) or 3-A
(global state), derive a new barrier entry specific to that source with the same structure:
Signal, Minimum fix shape, Do NOT do.

---

## Derivation instruction

After checking all four dimensions against the project context:

1. Produce one barrier entry per confirmed evidence pattern. Number them B1, B2, B3… in
   the order you found them.
2. Each entry must include an **Evidence** field naming exactly what was found in the project
   context (e.g. "axios 1.x found in DEPENDENCIES.md", "no openapi.yaml found in repository").
3. If the project shows a pattern of untestability that does not fit any dimension above,
   derive a new barrier entry for it. Use the same structure: Signal, Minimum fix shape,
   Do NOT do, Evidence.
4. If no evidence is found for a dimension, write nothing. There is no "skipped" list.

**The final test:** every barrier in `.bob/HEURISTICS.md` must be answerable with:
*"I know this barrier exists because I found [specific evidence] in this project."*
If it cannot be answered that way, remove the barrier.
