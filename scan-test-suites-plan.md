# scan-test-suites — skill-forge plan

## Top-Level Overview

This plan covers **one new skill** and **one new system prompt**:

1. **`SKILLS/scan-test-suites/`** — scans a target project's existing test suites and writes
   `.bob/TEST-SUITES.md`. Three files, mirrors `testability-heuristics/` exactly.

2. **`SKILLS/analyze-tests/analyze-tests.orchestrate.md`** — a system prompt (not a skill) that
   the parent agent runs directly. It reads all shared context first (once, in the parent), then
   dispatches `scan-test-suites` and `testability-heuristics` as two parallel `spawn_subagent`
   calls with `fork_context: true`, so both subagents inherit the already-loaded context and
   neither re-reads the project files.

### Why a system prompt and not a skill

A skill is loaded on demand by Bob when a user invokes it. A system prompt (`.orchestrate.md`)
is a directly-runnable instruction file that the agent executes as a task — it is not surfaced in
the skill picker and has no `description:` frontmatter trigger. This is appropriate here because
the orchestrator's only job is sequencing: read context once, fan out, collect results.
The `.orchestrate.md` suffix is a new convention established by this work.

### Pipeline after this work

```
analyze-codebase
      ↓
analyze-tests.orchestrate.md        ← parent reads shared context (TESTING.md, test files, configs)
      ├── [subagent, fork_context: true] scan-test-suites      → .bob/TEST-SUITES.md
      └── [subagent, fork_context: true] testability-heuristics → .bob/HEURISTICS.md

                    ↓  (on demand, per PR)
               testability-prep
```

`testability-prep` is NOT part of the automatic pipeline — it runs on demand when a PR is ready
for review. The orchestrator's job ends when both `.bob/TEST-SUITES.md` and `.bob/HEURISTICS.md`
are confirmed written.

---

## Sub-Tasks

### Sub-Task 1 — Write `SKILLS/scan-test-suites/SKILL.md`

**Intent**
Define the agent-executable procedure: numbered steps, each naming the exact Bob tool to use.
The step sequence must collect all test-related evidence (test files, config, package scripts),
load the reasoning guide, synthesise findings, and write `.bob/TEST-SUITES.md`.

**Expected Outcomes**
- `SKILLS/scan-test-suites/SKILL.md` exists
- Frontmatter has `name`, `description` (trigger-phrase prefixed), `metadata.disable-model-invocation: true`
- Step 1 reads `.bob/TESTING.md` or falls back to raw `glob`/`read_file` scan — same two-tier
  pattern as `testability-heuristics` uses for context
- Step 2 loads `SKILLS/scan-test-suites/test-suite-reader.md` (the reasoning guide) via `read_file`
- Step 3 performs the actual exploration: `glob` for test files, `read_file` on a representative
  sample, `read_file` on test runner config, `grep` for patterns
- Step 4 writes `.bob/TEST-SUITES.md` using `write_file`, following a defined schema
- On re-runs: overwrite completely, never merge

**Todo List**
1. Identify the exact frontmatter fields needed (mirror `analyze-codebase` / `testability-heuristics`)
2. Write Steps 1–4 with correct tool names at every action
3. Define the output schema for `TEST-SUITES.md` inline in Step 4 (header block + named sections)
4. Add the on-re-runs note

**Relevant Context**
- Mirror: [`SKILLS/testability-heuristics/SKILL.md`](SKILLS/testability-heuristics/SKILL.md)
- Output file path: `.bob/TEST-SUITES.md`
- Two-tier context-read pattern: lines 37–56 of `SKILLS/testability-heuristics/SKILL.md`

**Status** `[x] done`

---

### Sub-Task 2 — Write `SKILLS/scan-test-suites/test-suite-reader.md`

**Intent**
Author the reasoning guide — the third file analogous to `heuristics-reference.md`. This file
teaches the skill *how to read* a test suite rather than listing categories to apply.
It must describe the interpretive process: what a test file's structure reveals, how to detect
naming conventions, how to infer grouping and isolation patterns, how to extract assertions style,
how to spot seam patterns (mocks, stubs, test helpers). This is a guide for building understanding,
not a taxonomy to iterate over.

**Expected Outcomes**
- `SKILLS/scan-test-suites/test-suite-reader.md` exists
- Opens with a prominent caveat (same style as `heuristics-reference.md`) declaring it is a
  reasoning guide, not a checklist
- Covers: reading anatomy (describe/it blocks vs flat functions), convention extraction
  (file location, naming, grouping), seam patterns (what mock patterns reveal about DI style),
  assertion style (what the assertion vocabulary tells you about expected usage), teardown/setup
  idioms (what they reveal about state management), and coverage signal (what is conspicuously absent)
- Ends with a derivation instruction: how to turn observations into the sections of `TEST-SUITES.md`

**Todo List**
1. Draft each reading dimension as a titled section with "what to look for" and "what it reveals"
2. Write the derivation instruction section mapping observations → output file sections
3. Confirm the caveat block matches the style of `heuristics-reference.md` line 1–8

**Relevant Context**
- Mirror: [`SKILLS/testability-heuristics/heuristics-reference.md`](SKILLS/testability-heuristics/heuristics-reference.md)
- Must explain signals from the project's diff/test output already gathered in prior hackathon
  phases (the `review-body.md` and `testability-prep-plan.md` artifacts are the "prior phase" context)

**Status** `[x] done`

---

### Sub-Task 3 — Write `SKILLS/scan-test-suites/README.md`

**Intent**
Human-readable documentation: what the skill does, when it runs in the pipeline, how to install
and trigger it, and how its output relates to downstream skills.

**Expected Outcomes**
- `SKILLS/scan-test-suites/README.md` exists
- Describes the skill's purpose in plain language (no jargon)
- Shows the pipeline position: `analyze-codebase → scan-test-suites → testability-heuristics → testability-prep`
- Documents installation (`cp -r` and `install-skills.sh`) — same format as `testability-heuristics/README.md`
- Explains the relationship to `TESTING.md` (complement, not replacement) and to `testability-prep`
  (TEST-SUITES.md is consumed during Step 2 / Step 5 as the authoritative test-pattern source)

**Todo List**
1. Write "What this skill does" section
2. Write "When it is used" section with pipeline diagram
3. Write "Installation" section (copy from existing README pattern exactly)
4. Write "How to trigger it" section
5. Write "Relationship to other skills" section

**Relevant Context**
- Mirror: [`SKILLS/testability-heuristics/README.md`](SKILLS/testability-heuristics/README.md)
- Pipeline context: `review-body.md` documents the phase; `testability-prep-plan.md` names
  the downstream consumers

**Status** `[x] done`

---

### Sub-Task 4 — Write `SKILLS/analyze-tests/analyze-tests.orchestrate.md`

**Intent**
Author a system prompt that a developer runs directly as a task. The parent agent reads all
shared project context first (once), then fans out two parallel subagents with `fork_context: true`
so neither re-reads what the parent already loaded. Token-efficient by design.

**Expected Outcomes**
- `SKILLS/analyze-tests/analyze-tests.orchestrate.md` exists
- No frontmatter / no skill trigger — this is a plain Markdown instruction document
- **Phase 1 — Context load (parent agent):** calls `read_file` on `.bob/TESTING.md` (fallback:
  `TESTING.md`). If neither exists, blocks and asks the user to run `analyze-codebase` first.
  Then calls `read_file` on the skill files for both child skills:
  `SKILLS/scan-test-suites/SKILL.md` and `SKILLS/testability-heuristics/SKILL.md`,
  plus the reasoning guides (`test-suite-reader.md` and `heuristics-reference.md`).
  Also runs the initial `glob` sweeps for test files and config so the context is hot.
- **Phase 2 — Parallel dispatch:** calls `spawn_subagent` **twice in the same tool invocation**,
  both with `fork_context: true`. Each subagent description instructs it to execute its named skill
  from Step 2 onward (skipping the context-read step it would otherwise do first, since the parent
  already loaded it).
- **Phase 3 — Confirm and report:** calls `read_file` on `.bob/TEST-SUITES.md` and
  `.bob/HEURISTICS.md` to confirm both were written, then prints a structured summary.
- A clear note in the file explains this is NOT a skill — it is a system prompt to run directly.

**Todo List**
1. Write a header block explaining what this file is and how to run it
2. Write Phase 1 — explicit, ordered `read_file` and `glob` calls with exact paths
3. Write Phase 2 — parallel `spawn_subagent` block, `fork_context: true` on both, with exact
   per-subagent descriptions that reference the skill steps to execute
4. Write Phase 3 — confirmation reads and summary format
5. Add a "not a skill" callout at the top

**Relevant Context**
- `fork_context: true` passes parent conversation history to subagents — avoids re-reading
  any file the parent already loaded into context
- Skills to dispatch: `SKILLS/scan-test-suites/SKILL.md` (new, Steps 2–4 only) and
  `SKILLS/testability-heuristics/SKILL.md` (existing, Steps 2–4 only — Step 1 already done by parent)
- Output paths: `.bob/TEST-SUITES.md` and `.bob/HEURISTICS.md`
- `.orchestrate.md` suffix is a new convention introduced by this work — document it in the file header

**Status** `[x] done`

---

## Notes for Implementation

- No test files currently exist in this project (`glob **/*.test.*` returned nothing) — this is
  intentional. The skill is designed to run against **target projects**, not this skill-repository
  itself. The skill's Step 1 fallback (raw glob scan) handles the case where `TESTING.md` doesn't
  exist.
- The output file `TEST-SUITES.md` must be written to `.bob/` (same convention as `HEURISTICS.md`)
  so downstream skills have a stable, predictable path.
- The three files of `scan-test-suites` must follow the exact authoring style observed in
  `testability-heuristics`: numbered steps with tool names, evidence-driven reasoning, no implicit
  actions.
- The reasoning guide's name (`test-suite-reader.md`) follows the spirit of `heuristics-reference.md`
  but uses an active name since this guide describes a reading process rather than a passive taxonomy.
- `analyze-tests.orchestrate.md` is intentionally a single file with no frontmatter and no README.
  It is thin sequencing — all substance lives in the two child skills.
- The `.orchestrate.md` suffix is a new convention. The file must document this at its own top so
  future authors understand what it is.
- `testability-prep` is on-demand (per PR), NOT part of this pipeline. Do not reference it as a
  next step in the orchestrator's output or summary.
- Sub-Tasks 1–3 are independent of Sub-Task 4 and can be implemented in any order. Sub-Task 4
  depends on Sub-Task 1 (references the new skill by name) but NOT on Sub-Tasks 2 or 3.
- Implementation order recommendation: 2 → 1 → 3 → 4 (reasoning guide first so its output
  schema informs the SKILL.md procedure; orchestrator last since it references the new skill).
