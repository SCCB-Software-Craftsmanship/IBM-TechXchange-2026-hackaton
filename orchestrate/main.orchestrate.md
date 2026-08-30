---
# This is an orchestration prompt, not a skill.
# disable-model-invocation: true
---

# main.orchestrate.md

> **This is a system prompt, not a skill.**
> It is the single entry point for the full testability analysis pipeline.
> Run it by opening it as a task or pasting it as your initial prompt.
>
> **Responsibility split:**
> - `main.orchestrate.md` (this file) — enforces pipeline order. Checks whether
>   `analyze-codebase` has been run, runs it if not, then hands off to `analyze-tests`.
> - `orchestrate/analyze-tests.orchestrate.md` — loads shared context and fans out
>   `scan-test-suites` and `testability-heuristics` as parallel subagents.
>
> Never run `analyze-tests.orchestrate.md` directly on a fresh project — use this file.

---

## What this prompt does

Guarantees the full pipeline executes in the correct order:

```
1. analyze-codebase   → .bob/TESTING.md, DEPENDENCIES.md, CONVENTIONS.md, ARCHITECTURE.md …
2. analyze-tests      → .bob/TEST-SUITES.md  (parallel)
                      → .bob/HEURISTICS.md   (parallel)
```

Step 1 is skipped automatically when `analyze-codebase` output already exists — re-running
this prompt on an already-prepared project is safe and fast.

`testability-prep` is NOT part of this pipeline. It runs on demand per PR:
```
bob -p "run testability-prep on PR #<number>"
```

---

## Phase 1 — Check for analyze-codebase output

Call `read_file` on `.bob/TESTING.md`.

**If the file exists:** `analyze-codebase` has already been run. Print:
> ✓ `.bob/TESTING.md` found — skipping `analyze-codebase`.

Then skip to **Phase 3** immediately.

**If the file does not exist:** `analyze-codebase` has not been run for this project.
Print:
> ℹ️ `.bob/TESTING.md` not found — running `analyze-codebase .bob` first.

Then proceed to **Phase 2**.

---

## Phase 2 — Run analyze-codebase (only if Phase 1 found no output)

Spawn a subagent to run `analyze-codebase` with `.bob` as the output path.

Call `spawn_subagent` with:

```
name: "general"
fork_context: false
description: |
  Read the file SKILLS/analyze-codebase/SKILL.md in full, then execute every step
  in that skill exactly as written, using ".bob" as the OUTPUT_PATH argument.

  This means all output files (TESTING.md, DEPENDENCIES.md, CONVENTIONS.md,
  ARCHITECTURE.md, GLOSSARY.md, PROJECT.md, AGENTS.md) must be written to .bob/.

  Do not skip any step. Do not prompt the user for information the skill says to
  discover from source files. When the skill is complete, report:
  - Which output files were written (list each path)
  - Whether AGENTS.md was created or compared
  - The .last-analyzed timestamp written
```

**Wait for this subagent to complete before proceeding.**

After the subagent returns, call `read_file` on `.bob/TESTING.md` to confirm it was written.

If `.bob/TESTING.md` is still missing after the subagent returned, stop and report:
> ⚠️ `analyze-codebase` did not produce `.bob/TESTING.md`. Check the subagent output
> above for errors, resolve them, and re-run this prompt.

BLOCK — do not proceed to Phase 3.

---

## Phase 3 — Run analyze-tests

Now that `.bob/TESTING.md`, `.bob/DEPENDENCIES.md`, and `.bob/CONVENTIONS.md` are confirmed
present, hand off to the `analyze-tests` orchestrator.

Call `read_file` on `orchestrate/analyze-tests.orchestrate.md` to load its instructions into
this conversation's context.

Then execute those instructions from **Phase 1** onward as if they were written here —
the analyze-tests orchestrator is the authoritative definition of how to load shared context
and dispatch the parallel subagents. Do not summarise or shortcut its steps.

---

## Phase 4 — Final pipeline summary

After `analyze-tests` Phase 3 (confirm and report) completes, print:

```
## main — pipeline complete

### Pipeline steps executed
  <one of the following lines for Step 1>
  ✓ analyze-codebase  — already present, skipped
  ✓ analyze-codebase  — run via subagent, .bob/ written

  ✓ analyze-tests     — scan-test-suites + testability-heuristics ran in parallel

### Outputs
  .bob/TESTING.md        ✓
  .bob/DEPENDENCIES.md   ✓
  .bob/CONVENTIONS.md    ✓
  .bob/ARCHITECTURE.md   ✓
  .bob/TEST-SUITES.md    ✓  (<N> observation sections)
  .bob/HEURISTICS.md     ✓  (<N> barrier entries: <IDs>)

### Ready for
  testability-prep runs on demand when a PR is approved:
  bob -p "run testability-prep on PR #<number>"
```
