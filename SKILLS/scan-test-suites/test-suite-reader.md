# Test Suite Reader — Reasoning Guide

> **This is a reasoning guide, not a checklist.**
> Do not iterate over it top-to-bottom and apply every section.
> The `scan-test-suites` skill reads it to learn *how to think* about a test suite,
> then derives a structured description bottom-up from what it actually finds.
> Only observations with concrete evidence in the project appear in `.bob/TEST-SUITES.md`.

---

## How to use this guide

1. Read a representative sample of the project's test files — not to check them against a
   taxonomy, but to build a mental model of how the suite is organised and what it assumes.
2. For each **reading dimension** below, look for signals in the test code that reveal
   something about structure, convention, or intent.
3. If a signal is present, record the observation in project-specific terms: real file paths,
   real function names, real library names.
4. If no signal is present for a dimension, record nothing. Absence is not a finding.

**The output section count is determined by the project, not by this document.**
A project with a single flat test file and no mocks might produce 3 sections. A full-stack
monorepo with e2e, integration, and unit layers might produce 8. Both are correct.

---

## Reading Dimension 1 — Anatomy

*What is the structural unit of a test, and how are units grouped?*

Test frameworks impose or encourage a nesting style. Reading it reveals the team's mental model
of what a "test" is.

**Signals to look for:**

- `describe` / `it` / `test` blocks (Jest, Vitest, Mocha, Jasmine) — nested `describe` blocks
  indicate the team thinks in feature/method hierarchies, not flat lists.
- Top-level `def test_*` functions (pytest, unittest) — flat organisation with no explicit
  grouping beyond the file.
- `suite` / `spec` classes (RSpec, JUnit) — class-per-feature organisation with lifecycle hooks
  at the class level.
- Single-file suites vs. one-file-per-module organisation.

**What it reveals:**
The nesting style tells a downstream skill how to name and locate test cases. A `describe` /
`it` tree means new tests must be placed inside the correct `describe` block. A flat pytest file
means new tests are added as top-level functions. This shapes the `generate-tests` output format.

---

## Reading Dimension 2 — File Layout and Naming

*Where do test files live relative to the code they test, and how are they named?*

**Signals to look for:**

- Co-location: `src/foo/bar.ts` paired with `src/foo/bar.test.ts` — test lives beside the source.
- Mirrored directory: `src/foo/bar.ts` paired with `tests/foo/bar_test.py` — separate tree that
  mirrors the source layout.
- Flat test directory: all tests in `tests/` or `__tests__/` with no subdirectory structure.
- Naming suffix: `.test.ts`, `.spec.ts`, `_test.go`, `Test.java`, `_spec.rb`.
- Naming convention for what is being tested: `<module>.test.ts`, `<Class>Test.java`,
  `test_<module>.py`.

**What it reveals:**
File location and naming are the first thing a developer looks for when writing a new test.
Recording the convention prevents a new test from being placed in the wrong location or
named inconsistently.

---

## Reading Dimension 3 — Setup and Teardown

*How does the suite establish and clean up test state?*

**Signals to look for:**

- `beforeEach` / `afterEach` — per-test setup and teardown. Signals the suite resets state
  between tests.
- `beforeAll` / `afterAll` — suite-level setup. Signals shared state within a describe block;
  order-dependence is possible.
- `setUp` / `tearDown` (unittest), `setup` / `teardown` (pytest) — same patterns, different names.
- Custom helper factories: `NewTestService(t)`, `createTestDb()`, `buildFixture()` — the team
  has abstracted setup into a reusable function. Record the function name and file.
- Explicit reset calls: `jest.clearAllMocks()`, `vi.restoreAllMocks()`, `sandbox.restore()` —
  signals mock state is shared and must be cleared.
- `defer cleanup()` or `t.Cleanup(fn)` (Go) — cleanup is registered at the test level.

**What it reveals:**
Setup patterns reveal whether tests are truly isolated or share state. If `beforeAll` is used
to spin up a database, new tests that rely on a different schema need to understand this.
Custom helper factories mean new tests should use the same factory, not invent a new pattern.

---

## Reading Dimension 4 — Seam Patterns (How Dependencies Are Substituted)

*What technique does the suite use to replace real dependencies with controlled ones?*

This dimension reveals the Dependency Injection style in production code, which is the
most important thing a test-generation skill needs to know.

**Signals to look for:**

- `jest.mock('module-path')` / `vi.mock(...)` — module-level replacement. Signals production
  code imports the dependency at the top of the file (no parameter injection).
- `jest.spyOn(obj, 'method')` / `sinon.stub(obj, 'method')` — object-level interception.
  Signals production code receives the dependency as an object.
- Manual factory injection: `new Service({ db: fakeDb })` — constructor/option-bag injection.
  Signals production code accepts dependencies via constructor parameters.
- Default-parameter injection: `function fn(dep = realDep)` — the test passes a substitute
  as the last argument. Signals lightweight DI without a framework.
- `nock` / `msw` / `fetchMock` — HTTP interception at the network layer. Signals production
  code uses fetch or a named HTTP client directly, without injection.
- Fixture files: `__fixtures__/`, `testdata/`, `.json` / `.yaml` files read by tests — signals
  the suite relies on static data rather than programmatic construction.

**What it reveals:**
The seam pattern in existing tests is the strongest possible signal for how new tests must be
written. If all existing tests use `jest.mock`, a new test that tries constructor injection will
not match the codebase. The `testability-prep` skill uses this to validate whether a production
code change is necessary to make a new behavior testable.

---

## Reading Dimension 5 — Assertion Style

*What vocabulary does the suite use to express expectations?*

**Signals to look for:**

- Assertion library: `expect(...).toBe(...)` (Jest/Vitest), `assert.equal(...)` (Node assert,
  Go testing), `self.assertEqual(...)` (unittest), `expect(...).to eq(...)` (RSpec).
- Custom matchers: `expect(res).toMatchApiShape(schema)` — signals the team has invested in
  domain-specific assertion helpers. Record the helper name and file.
- Snapshot testing: `expect(component).toMatchSnapshot()` — signals UI or serialisation output
  is tested by comparison to a stored reference.
- Error assertion: `expect(() => fn()).toThrow(ErrorClass)` vs. `try/catch` with `fail()` —
  tells a downstream skill which idiom to use for exception-path tests.

**What it reveals:**
Assertion style is a convention, not just preference. New tests that use a different assertion
library or skip established custom matchers will fail review. Recording the vocabulary means
`generate-tests` can produce tests that pass immediately without style corrections.

---

## Reading Dimension 6 — Coverage Shape (What Is and Is Not Tested)

*What categories of behavior does the suite currently exercise, and what is conspicuously absent?*

This dimension requires inference, not just observation.

**Signals to look for:**

- What layers have dedicated test files: unit (pure functions), integration (DB/HTTP with real
  or stubbed dependencies), e2e (full request-response cycle).
- What is NOT present: a project with only unit tests and no integration tests signals a
  deliberate choice or a gap. Record which layers exist — not which are missing.
- Test file count relative to source file count: a 1:1 ratio is high coverage; 1:10 signals
  sparse coverage. State the ratio approximately, not as a judgment.
- What is explicitly skipped: `test.skip`, `xit`, `@pytest.mark.skip` — skipped tests name
  known gaps. Record the skip reason if present.

**What it reveals:**
Coverage shape tells a test-generation skill where new tests belong. If no e2e tests exist,
the skill should not generate one. If only unit tests exist for the auth module, a new auth
test should be a unit test unless evidence says otherwise.

---

## Derivation Instruction

After reading the test suite through the six dimensions above:

1. Produce one section per dimension where evidence was found. Write each section in
   project-specific terms: real file paths, real library names, real function names.
2. Each section must include an **Evidence** field naming the specific file(s) or pattern(s)
   that confirmed the observation.
3. If a dimension has no evidence in this project, write nothing. There is no "not applicable"
   entry.
4. If the project shows a structural pattern not covered by any dimension above, derive a
   new section for it using the same structure: observation, evidence, what it reveals.

The final test: every section in `.bob/TEST-SUITES.md` must be answerable with:
*"I know this because I found [specific evidence] in this project's test files."*
If it cannot be answered that way, remove the section.
