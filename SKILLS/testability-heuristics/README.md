# testability-heuristics

## What this skill does

`testability-heuristics` reads the project context produced by `analyze-codebase`
(`TESTING.md`, `CONVENTIONS.md`, `DEPENDENCIES.md`, `ARCHITECTURE.md`) and **derives**
a set of concrete testability barriers grounded in what this repository actually does.

Rather than translating a fixed list of barrier types, the skill builds an evidence
inventory from the project context and produces one barrier entry per confirmed evidence
pattern. A project with no UI layer produces no UI-locator barrier. A project with no
background workers produces no async-boundary barrier. The barrier count and content are
determined entirely by what is found — not by a preset taxonomy.

Each barrier in the generated `.bob/HEURISTICS.md` includes an **Evidence** field that
names the specific artifact (library, pattern, file, or absence of file) that confirmed
the barrier exists in this project.

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
test framework change. The generated `.bob/HEURISTICS.md` is overwritten completely on each run,
re-deriving barriers from the current evidence.

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

When `testability-prep` runs Step 3 (Identify barriers), it uses a two-tier lookup:

1. `.bob/HEURISTICS.md` — project-derived, use directly (best). Each barrier already names
   the real library, function, and fix for this repository.
2. `SKILLS/testability-heuristics/heuristics-reference.md` — the reasoning guide. Used as
   a fallback when `.bob/HEURISTICS.md` has not been generated yet. `testability-prep` reads
   the four diagnostic dimensions and filters by what is plausible from the diff's file types.

Running `testability-heuristics` before `testability-prep` gives the highest-quality barrier
detection because the checklist is already derived from the project's confirmed evidence.
