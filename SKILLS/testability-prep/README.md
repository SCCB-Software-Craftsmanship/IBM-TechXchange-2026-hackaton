# testability-prep

## What this skill does

`testability-prep` analyzes the diff of an already-approved PR and asks, for every new or changed
piece of behavior: _what prevents an automated test from observing, controlling, or isolating this
behavior?_ It then makes the **minimum production code change** needed to remove each real barrier
and opens a child PR against the original branch. It never restructures code for general
"cleanliness", and it never introduces abstractions or dependency injection unless a concrete,
nameable test is currently blocked by their absence.

The skill consumes whatever `analyze-codebase` has already generated (`TESTING.md`,
`CONVENTIONS.md`) to learn project conventions before acting — it never rediscovers them from
scratch.

## When it is used

Run **after** a PR has been approved by a human reviewer and **before** any test-generation skill
(`generate-tests`, Layer Classifier, Oracle Discipline, Mutation Gate, etc.) acts on the code.
The typical pipeline is:

```
PR approved → testability-prep → generate-tests
```

If `testability-prep` finds no barrier, it reports that explicitly and the pipeline moves
directly to `generate-tests`.

## Installation

```bash
# From the repository root:
bash scripts/install-skills.sh

# Or manually:
cp -r SKILLS/testability-prep ~/.bob/skills/
```

## How to trigger it manually

```
bob -p "run the testability-prep skill on PR #42"
```

You can also paste a diff directly:

```
bob -p "run the testability-prep skill on the following diff: <paste diff here>"
```

In both cases Bob will:

1. Read the diff (and `TESTING.md` / `CONVENTIONS.md` if present).
2. Identify any barriers to automated testing in the changed behavior.
3. Either apply the minimum fix and open a child PR, or report that no barriers were found.
