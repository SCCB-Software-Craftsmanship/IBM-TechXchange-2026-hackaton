---
# This is an orchestration prompt, not a skill.
# disable-model-invocation: true
---

# analyze-tests.orchestrate.md

> **This is a system prompt, not a skill.**
> It is not surfaced in Bob's skill picker and has no `/trigger` command.
> Run it by opening it as a task or pasting it as your initial prompt.
> It orchestrates two child skills in parallel — all real work happens in those skills.
>
> **`.orchestrate.md` convention:** files with this suffix are parent-agent orchestration
> prompts. They follow a three-phase pattern: (1) load shared context into the parent's
> conversation window, (2) dispatch parallel subagents with `fork_context: true` so they
> inherit that context without re-reading anything, (3) confirm outputs and report.

---

## What this prompt does

Produces both `.bob/TEST-SUITES.md` and `.bob/HEURISTICS.md` in a single run by dispatching
`scan-test-suites` and `testability-heuristics` as parallel subagents. The parent agent
reads all shared project context first — once — so the subagents receive it via
`fork_context: true` and skip their own context-loading steps entirely.

**Why parallel:** both skills read the same project context independently. Running them
sequentially doubles the context reads. By loading context in the parent and passing it
via `fork_context: true`, the token cost of the shared context is paid exactly once.

---

## Phase 1 — Load shared context (parent agent, run this before any subagent)

Execute ALL reads in this phase before spawning any subagent. The goal is to load every
file both child skills need into this conversation's context window.

### 1.1 — Project testing context

Call `read_file` on each of the following, trying paths in order (stop at first hit per file):

- **TESTING.md:** `.bob/TESTING.md` → `TESTING.md`
- **DEPENDENCIES.md:** `.bob/DEPENDENCIES.md` → `DEPENDENCIES.md`
- **CONVENTIONS.md:** `.bob/CONVENTIONS.md` → `CONVENTIONS.md`

**If none of TESTING.md, DEPENDENCIES.md, or CONVENTIONS.md are found in either location:**
Stop and ask the user:
> ⚠️ No `analyze-codebase` output found (`.bob/TESTING.md` and root `TESTING.md` both missing).
> Please run `/analyze-codebase` first, then re-run this prompt.

BLOCK on user response. Do not proceed to 1.2.

### 1.2 — Test runner configuration

Call `glob` with each of the following patterns and call `read_file` on every match found:

- `jest.config.*`
- `vitest.config.*`
- `pytest.ini`
- `setup.cfg`
- `playwright.config.*`
- `cypress.config.*`

### 1.3 — Representative test file sample

Call `glob` with each of the following patterns. Collect all matches:

- `**/*.test.ts`, `**/*.test.js`, `**/*.test.tsx`
- `**/*.spec.ts`, `**/*.spec.js`, `**/*.spec.tsx`
- `**/*_test.go`, `**/*_test.py`, `**/*Test.java`, `**/*_spec.rb`
- `**/__tests__/**/*`

From the collected matches, select up to **8 files** that represent different layers or
concerns (unit, integration, e2e; different modules). Call `read_file` on each with
range `1-80`.

### 1.4 — Skill procedures and reasoning guides

Call `read_file` on each of the following four files:

1. `SKILLS/scan-test-suites/SKILL.md`
2. `SKILLS/scan-test-suites/test-suite-reader.md`
3. `SKILLS/testability-heuristics/SKILL.md`
4. `SKILLS/testability-heuristics/heuristics-reference.md`

After all four reads complete, Phase 1 is done. The conversation window now contains
everything both child skills need. Proceed to Phase 2 immediately.

---

## Phase 2 — Parallel subagent dispatch

Issue both `spawn_subagent` calls **in the same tool invocation turn** so they run in
parallel. Set `fork_context: true` on both — this is what passes the Phase 1 context
to the subagents without re-reading.

### Subagent A — scan-test-suites

```
name: "general"
fork_context: true
description: |
  You have been given the full project context (TESTING.md, DEPENDENCIES.md, CONVENTIONS.md,
  test runner config files, and a sample of test files) already loaded in the conversation
  history above. Do NOT re-read any of those files — the context is already present.

  Execute the scan-test-suites skill procedure loaded from SKILLS/scan-test-suites/SKILL.md,
  starting from Step 2 (load the reasoning guide) onward. Step 1 has already been completed
  by the parent agent — treat the context in the conversation history as the output of Step 1.

  Specifically:
  - Step 2: the reasoning guide (test-suite-reader.md) is already in the conversation history.
    You do not need to call read_file again — use the content already present.
  - Step 3: apply the six reading dimensions from the guide to the test file content already
    in the conversation history. Use grep if you need to check for a pattern not covered by
    the already-read files, but do not re-read files already present.
  - Step 4: call write_file to write .bob/TEST-SUITES.md following the schema in SKILL.md.

  When done, report:
  - The path written: .bob/TEST-SUITES.md
  - The number of observation sections written
  - The evidence sources used (file names)
```

### Subagent B — testability-heuristics

```
name: "general"
fork_context: true
description: |
  You have been given the full project context (TESTING.md, DEPENDENCIES.md, CONVENTIONS.md,
  test runner config files, and a sample of test files) already loaded in the conversation
  history above. Do NOT re-read any of those files — the context is already present.

  Execute the testability-heuristics skill procedure loaded from
  SKILLS/testability-heuristics/SKILL.md, starting from Step 2 (load the reasoning guide)
  onward. Step 1 has already been completed by the parent agent — treat the context in the
  conversation history as the evidence inventory from Step 1.

  Specifically:
  - Step 2: the reasoning guide (heuristics-reference.md) is already in the conversation
    history. You do not need to call read_file again — use the content already present.
  - Step 3: derive barriers from the evidence in the conversation history by applying the
    four diagnostic dimensions from the guide.
  - Step 4: call write_file to write .bob/HEURISTICS.md following the schema in SKILL.md.

  When done, report:
  - The path written: .bob/HEURISTICS.md
  - The number of barrier entries written (B1, B2, …)
  - The evidence items that triggered each barrier
```

---

## Phase 3 — Confirm and report

After both subagents return:

1. Call `read_file` on `.bob/TEST-SUITES.md` — confirm the file exists and note the section
   headings present.
2. Call `read_file` on `.bob/HEURISTICS.md` — confirm the file exists and note the barrier
   IDs present (B1, B2, …).
3. Print the following structured summary:

```
## analyze-tests — run complete

### Outputs
  .bob/TEST-SUITES.md   — <N> observation sections
    Sections: <comma-separated list of section titles>

  .bob/HEURISTICS.md    — <N> barrier entries
    Barriers: <comma-separated list of barrier IDs and one-line titles>

### Context sources used (loaded once, shared by both subagents)
  <bullet list of files actually read in Phase 1>

### Next step
  Both output files are ready for on-demand use by testability-prep when a PR is submitted.
  Run: bob -p "run testability-prep on PR #<number>"
```
