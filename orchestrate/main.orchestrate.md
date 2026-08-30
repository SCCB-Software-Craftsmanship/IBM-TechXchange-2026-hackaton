---
# This is an orchestration prompt, not a skill.
# disable-model-invocation: true
---

# main.orchestrate.md

> **This is a system prompt, not a skill.**
> It is the **complete onboarding entry point** for a project — run it once on a fresh
> clone to install skills, bootstrap the database, and generate all knowledge files.
> Re-running it on an already-prepared project is safe: every step is idempotent.
>
> **Responsibility split:**
> - `main.orchestrate.md` (this file) — full project onboarding and pipeline setup.
> - `orchestrate/analyze-tests.orchestrate.md` — parallel test-suite analysis (called by Phase 3).
> - `orchestrate/generate-tests.orchestrate.md` — on-demand test generation per Cloudant run.

---

## What this prompt does

```
Phase 0 — Prerequisites & tooling setup
  0.1  Verify gh CLI authenticated
  0.2  Install Bob skills (scripts/install-skills.sh)

Phase 1 — Check for analyze-codebase output (skip if already present)

Phase 2 — Run analyze-codebase → .bob/ knowledge files (if Phase 1 missed)

Phase 3 — Run analyze-tests
           ├── [parallel] scan-test-suites      → .bob/TEST-SUITES.md
           └── [parallel] testability-heuristics → .bob/HEURISTICS.md

Phase 4 — Final summary
```

Every phase is skipped or fast-pathed when its outputs already exist.
`testability-prep` and `generate-tests` are NOT part of this pipeline — they run on demand.

---

## Phase 0 — Prerequisites and tooling setup

Run all checks in this phase before anything else. They are fast and idempotent.

### 0.1 — Verify gh CLI is authenticated

Call `execute_command` with:

```bash
gh auth status
```

If the command fails or shows "not logged in", stop and report:
> ⚠️ `gh` CLI is not authenticated. Run `gh auth login` and re-run this prompt.

BLOCK — do not proceed.

### 0.2 — Install Bob skills

Call `execute_command` with:

```bash
bash scripts/install-skills.sh
```

This copies every skill from `SKILLS/` into `~/.bob/skills/` so Bob can invoke them.
The script is idempotent — re-running it updates existing skills without duplication.

If the command fails, stop and report:
> ⚠️ `scripts/install-skills.sh` failed. Check the output above and resolve the error.

BLOCK — do not proceed.

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
## main — onboarding complete

### Phase 0 — Prerequisites
  ✓ gh CLI authenticated
  ✓ Bob skills installed  (~/.bob/skills/)

### Phase 1-2 — Codebase analysis
  <one of the following lines>
  ✓ analyze-codebase  — already present, skipped
  ✓ analyze-codebase  — run via subagent, .bob/ written

### Phase 3 — Test analysis
  ✓ analyze-tests  — scan-test-suites + testability-heuristics ran in parallel

### Knowledge files written to .bob/
  PROJECT.md       ✓     TESTING.md       ✓
  ARCHITECTURE.md  ✓     DEPENDENCIES.md  ✓
  CONVENTIONS.md   ✓     GLOSSARY.md      ✓
  TEST-SUITES.md   ✓  (<N> observation sections)
  HEURISTICS.md    ✓  (<N> barrier entries: <IDs>)

### Project is ready for
  Per-PR testability analysis (on demand when a PR is approved):
    bob -p "run testability-prep on PR #<number>"

  Test generation (on demand from Cloudant queue):
    Open orchestrate/generate-tests.orchestrate.md as a task
```
