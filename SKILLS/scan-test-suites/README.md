# scan-test-suites

## What this skill does

`scan-test-suites` reads a project's existing test files and configuration, extracts structural
patterns across six dimensions (anatomy, file layout, setup/teardown, seam patterns, assertion
style, and coverage shape), and writes `.bob/TEST-SUITES.md` — a self-contained description that
downstream skills consume without further interpretation.

Rather than applying a fixed taxonomy, the skill builds observations bottom-up from evidence
found in the project's actual test code. A project with a single flat unit-test file and no
mocking produces two or three sections. A full-stack project with unit, integration, and e2e
layers produces five to eight. Both are correct. Every section includes an **Evidence** field
naming the specific file or pattern that confirmed the observation.

The generated `.bob/TEST-SUITES.md` tells a test-generation skill:

- What structural unit to use (`describe`/`it`, top-level functions, class-per-feature).
- Where to place new test files and how to name them.
- How the suite resets state between tests, and which setup helpers already exist.
- What substitution technique to use for dependencies (module mock, object stub, parameter injection).
- What assertion vocabulary to use.
- Which test layers exist and which do not.

## When it is used

Run **after** `analyze-codebase` (recommended) and typically in parallel with
`testability-heuristics` via the `analyze-tests.orchestrate.md` system prompt. The pipeline is:

```
analyze-codebase
      ↓
analyze-tests.orchestrate.md
      ├── [parallel] scan-test-suites      → .bob/TEST-SUITES.md
      └── [parallel] testability-heuristics → .bob/HEURISTICS.md
```

`scan-test-suites` can also be run standalone if only the test suite map is needed. It falls
back to reading source files and manifests directly when `.bob/TESTING.md` does not exist.

Re-run `scan-test-suites` whenever the project's test framework, test organisation, or primary
test helper patterns change. The generated `.bob/TEST-SUITES.md` is overwritten completely on
each run.

## Installation

```bash
# From the repository root:
bash scripts/install-skills.sh

# Or manually:
cp -r SKILLS/scan-test-suites ~/.bob/skills/
```

## How to trigger it manually

```
/scan-test-suites
```

Bob will:

1. Read `.bob/TESTING.md`, `.bob/DEPENDENCIES.md`, `.bob/CONVENTIONS.md` if they exist,
   or fall back to direct manifest inspection.
2. Load the reasoning guide from `SKILLS/scan-test-suites/test-suite-reader.md`.
3. Glob for test files, read a representative sample (up to 8 files), and apply the six
   reading dimensions from the guide.
4. Write `.bob/TEST-SUITES.md`.

## Relationship to other skills

### `analyze-codebase`

`analyze-codebase` produces `TESTING.md` — a framework-level description of the test setup
(runner, command, test types, coverage strategy). `scan-test-suites` goes deeper: it reads
the test files themselves and produces a structural description of how tests are actually
written — naming conventions, grouping style, seam patterns, assertion vocabulary. The two
files are complementary; neither replaces the other.

### `testability-heuristics`

`testability-heuristics` derives testability barriers from the project's production code
dependencies. `scan-test-suites` describes the existing test suite shape. Both outputs are
used together: `TEST-SUITES.md` tells a downstream skill how to write a test; `HEURISTICS.md`
tells it what barriers might prevent the test from passing.

### `testability-prep`

`testability-prep` runs on demand for a specific approved PR — it is not part of the
automated analysis pipeline. When it runs, it reads both `.bob/TEST-SUITES.md` (to match
new tests to the existing suite's conventions) and `.bob/HEURISTICS.md` (to identify barriers
in the PR's diff). Running `scan-test-suites` before `testability-prep` ensures the suite
description is current.

## File structure

```
SKILLS/scan-test-suites/
├── SKILL.md               ← Bob procedural instructions (Steps 1–4)
├── README.md              ← this file
└── test-suite-reader.md   ← reasoning guide for reading test suites
```
