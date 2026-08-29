# testability-heuristics

## What this skill does

`testability-heuristics` reads the project context already produced by `analyze-codebase`
(`TESTING.md`, `CONVENTIONS.md`, `DEPENDENCIES.md`, `ARCHITECTURE.md`) and translates a
universal barrier reference into a concrete, project-adapted `.bob/HEURISTICS.md` — replacing
abstract descriptions ("the I/O client", "the time source") with the real library names,
idioms, and file paths found in this specific repository.

The universal reference (`heuristics-reference.md`) defines nine testability barrier types:

| ID | Barrier |
|---|---|
| A1 | Unstable or missing observable locator |
| A2 | Uncontrollable time or non-deterministic value source |
| A3 | Coupled I/O boundary |
| A4 | Missing deterministic fixture or test data |
| A5 | Missing or mismatched behavioral contract |
| A6 | Uncontrollable async boundary |
| A7 | Global or singleton state mutation |
| A8 | Environment or configuration coupling |
| A9 | Opaque initialization side effect |

The generated `.bob/HEURISTICS.md` contains only the barriers relevant to this project,
each rewritten in concrete project-specific terms. Barriers with no plausible signal in the
project are omitted and listed in a "Skipped barriers" section with a one-line reason.

The generated file is what `testability-prep` reads during Step 3 (Identify barriers) — it
never needs further interpretation.

## When it is used

Run **after** `analyze-codebase` (recommended) and **before** `testability-prep`. The
typical pipeline is:

```
PR approved → analyze-codebase → testability-heuristics → testability-prep → generate-tests
```

`testability-heuristics` can also be run without a prior `analyze-codebase` run — it will
infer the project context directly from source files and dependency manifests. However,
running `analyze-codebase` first produces richer adaptation because all four knowledge files
(`TESTING.md`, `CONVENTIONS.md`, `DEPENDENCIES.md`, `ARCHITECTURE.md`) are available.

Re-run `testability-heuristics` whenever the project's primary dependencies, language, or
test framework change. The generated `.bob/HEURISTICS.md` is overwritten completely on each run.

## Installation

```bash
# From the repository root:
bash scripts/install-skills.sh

# Or manually:
cp -r SKILLS/testability-heuristics ~/.bob/skills/
```

## How to trigger it manually

```
/testability-heuristics
```

Bob will:

1. Read the `analyze-codebase` knowledge files (`.bob/TESTING.md`, `.bob/CONVENTIONS.md`,
   `.bob/DEPENDENCIES.md`, `.bob/ARCHITECTURE.md`) if they exist, or fall back to direct
   source file inspection.
2. Load the universal barrier reference from
   `SKILLS/testability-heuristics/heuristics-reference.md`.
3. Adapt each barrier A1–A9 to the project's concrete stack, libraries, and patterns.
   Omit barriers with no plausible signal in the project.
4. Write the result to `.bob/HEURISTICS.md`.

## Relationship to `testability-prep`

When `testability-prep` runs Step 3 (Identify barriers), it checks for `.bob/HEURISTICS.md`
first. If the file exists, it uses that as the barrier checklist directly — no further
adaptation needed. This three-tier lookup means:

1. `.bob/HEURISTICS.md` — project-adapted, use directly (best).
2. `SKILLS/testability-heuristics/heuristics-reference.md` — universal, apply lightweight
   filtering based on diff file types (fallback).
3. `SKILLS/testability-prep/seams-reference.md` — legacy five-barrier checklist (last resort).

Running `testability-heuristics` before `testability-prep` ensures the highest-quality
barrier detection because the checklist is already concretized for the project's exact stack.
