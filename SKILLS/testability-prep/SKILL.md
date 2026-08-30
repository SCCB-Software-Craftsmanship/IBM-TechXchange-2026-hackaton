---
name: testability-prep
description: Use /testability-prep when a PR has been approved and needs to be prepared for test generation — discovers the linked issue, reads project conventions, verifies the environment, analyzes the diff for testability barriers, applies the minimum production code change needed to remove each barrier, and opens a child PR with a thorough analysis report.
---

# testability-prep

Given an already-approved PR (branch reference or pasted diff), this skill asks — for every
changed or new piece of behavior in the diff:

> What prevents an automated test from observing, controlling, or isolating this behavior?

It then makes the **minimum production code change** needed to remove each real barrier and opens
a child PR against the original branch with a thorough report. If no barrier is found, no PR is
opened.

---

## Non-negotiable rule

> Do not introduce an abstraction, layer, interface, or dependency injection, and do not add
> test-only code to production, unless the current implementation demonstrably blocks a test
> required for the changed behavior.

Every change this skill proposes must be able to justify, in one sentence, exactly which test it
unblocks. If it cannot justify that, the change must not be made.

---

## Rule about existing conventions

Before adding any new test selector or contract:

1. Read `CONVENTIONS.md` (produced by `analyze-codebase`), if it exists, to check whether the
   repository already has an established test-selector convention (e.g. `data-testid`, `data-cy`,
   or none).
2. If a convention already exists, reuse it exactly — never add a second selector attribute
   "just in case" (e.g. never place both `data-cy` and `data-testid` on the same element).
3. Only introduce a new convention if the repository genuinely has none and the new behavior
   cannot be located via accessible role or visible text.
4. Read `TESTING.md`, if it exists, to learn which test framework/pattern the repository already
   uses (e.g. a helper like `NewTestService(t)`) — any example test suggested as part of a
   testability change must follow that existing pattern, never introduce a new framework.

If `TESTING.md` or `CONVENTIONS.md` do not exist in the repository (because `analyze-codebase`
has not run there yet), infer the convention by looking directly at existing test files before
assuming no pattern exists.

---

## Step-by-step process

### Step 1 — Discover the linked issue

The goal is to understand the problem this PR solves. Search the following sources in order,
stopping as soon as a clear issue reference is found:

1. **PR `closingIssuesReferences`** — call `execute_command` with
   `gh pr view <number> --json closingIssuesReferences,title,body,headRefName,baseRefName,commits`
   and inspect the `closingIssuesReferences` array.
2. **PR body** — scan the `body` field for patterns like `Closes #N`, `Fixes #N`, `Resolves #N`,
   or any bare `#N` reference.
3. **PR title** — scan the `title` field for an issue number reference (e.g. `fix(#42): …`).
4. **PR comments** — call `execute_command` with
   `gh pr view <number> --json comments --jq '.comments[].body'`
   and scan each comment for the same patterns.
5. **Commit messages** — inspect the `commits` field returned in step 1 and scan each commit
   message for `#N` references or issue URLs.

**If a reference is found** in any of the above: call `execute_command` with
`gh issue view <issue-number> --json title,body,labels` and record:
- The problem being solved.
- Any acceptance criteria or test requirements mentioned.
- Labels that indicate issue type (bug, feature, etc.).

**If no reference is found after all sources are exhausted**: ask the human:
> ⚠️ No issue reference found for PR #<number> in the PR metadata, body, title, comments, or
> commit messages. Can you provide the issue number or a brief description of the problem this
> PR solves? (This context is used to write the testability analysis report.)

BLOCK on the human response.

### Step 2 — Read established conventions and understand the project

Call `read_file` on each of the following, trying paths in order (stop at first hit per file):

**TESTING.md** (test framework, helper patterns, async utilities, teardown idioms):
- `.context/TESTING.md` → `.bob/TESTING.md` → `TESTING.md`

**DEPENDENCIES.md** (runtime dependencies, I/O clients, time/ID utilities, async primitives,
UI framework):
- `.context/DEPENDENCIES.md` → `.bob/DEPENDENCIES.md` → `DEPENDENCIES.md`

**CONVENTIONS.md** (selector/identifier convention, naming patterns, code style):
- `.context/CONVENTIONS.md` → `.bob/CONVENTIONS.md` → `CONVENTIONS.md`

If **none** of the above exist for a given file, fall back to direct inspection:
- `glob` with `**/*.test.*`, `**/*.spec.*`, `**/*_test.*` — pick up to 5 results and call
  `read_file` on each with range `1-80` to infer test framework and helpers.
- `glob` the workspace root for manifest files (dependency declarations, lock files) — read
  whichever is found to identify the primary language and key library names.

Record what each file reveals. This context is used in every subsequent step.

### Step 3 — Verify the environment

Before touching any code, verify that the tools and dependencies required to run the project's
tests are present on the current machine.

1. From `TESTING.md` and `DEPENDENCIES.md` gathered in Step 2, identify:
   - The **test runner** and the command used to invoke it.
   - The **package manager or build tool** used to install dependencies.
   - Any **external services** required (containers, databases, object storage) and whether they
     can be started locally.

2. For each identified runtime and tool, call `execute_command` to verify it is available.
   Use the version-check idiom natural to that tool — derive the exact command from what
   `TESTING.md` / `DEPENDENCIES.md` revealed, not from a fixed list.

3. For each dependency set, call `execute_command` to verify dependencies are installed or can
   be installed. Use the install/verify command that `TESTING.md` or the manifest file specifies.

4. **If any required tool is missing or dependencies cannot be installed**, abort:
   > ⚠️ Cannot proceed — required runtime or dependency not available: <name>.
   > Please install it and re-run.
   Do **not** make any code changes or open any PR.

   BLOCK and let human know.

### Step 4 — Get the PR diff

Obtain only what changed — not the whole repository:

- `gh pr diff <number>` if a PR number was given.
- The pasted diff provided directly by the user.

Do not read files beyond the diff at this stage unless a specific file path in the diff needs
context (in which case read only the relevant portion with a line range).

### Step 5 — Identify barriers

Load the barrier checklist using the following two-tier lookup — use the first tier that
succeeds and skip the remaining tier:

1. **Project-adapted checklist (preferred):** Call `read_file` on `.bob/HEURISTICS.md`.
   If the file exists, use it as the barrier checklist directly — it is already concretized
   for this project's stack and libraries. No further filtering or adaptation is needed.

2. **Universal reference (fallback):** Call `read_file` on
   `SKILLS/testability-heuristics/heuristics-reference.md`. Apply lightweight filtering
   before scanning: for each barrier A1–A9, check whether the diff contains file types or
   patterns that could plausibly exhibit that barrier (e.g. skip A1 if the diff contains no
   UI files; skip A6 if no async operations are visible). Use only the barriers that survive
   this check.

With the checklist loaded, ask for every changed or new section in the diff:

> What prevents an automated test from observing, controlling, or isolating this behavior?

Incorporate what was learned in Step 2 (TESTING.md, DEPENDENCIES.md, CONVENTIONS.md) when
evaluating each barrier: use real library names, real helper patterns, and real test file
conventions from the project.

Only barriers that block a concrete, nameable test qualify. Record each barrier as:

- **Location** — file and line range in the diff.
- **Barrier type** — one of the barrier IDs from the loaded checklist (A1–A9 or B1–BN).
- **Blocked test** — a one-sentence description of the specific test that is currently
  impossible without a fix.

Discard any entry where the "blocked test" field cannot be filled in concretely.

### Step 6 — Propose the minimal fix for each barrier

For each recorded barrier, propose the smallest change that makes the blocked test possible:

- Follow the repository's existing convention (from Step 2) for any selector or contract change.
- Do not restructure code beyond what is required to unblock the named test.
- Apply the non-negotiable rule: if the change cannot name the test it unblocks, discard it.

### Step 7 — Apply the non-negotiable rule (gate check)

Before touching any file, re-read the non-negotiable rule above. For each proposed change,
verify:

1. Does this change introduce an abstraction, layer, interface, or DI? If yes — is there a
   concrete named test that was previously blocked by the absence of this abstraction? If no
   such test can be named, discard the change.
2. Does this change add test-only code to production? If yes — is there a concrete named test
   that requires this production-side hook? If no, discard the change.

Only changes that survive this gate proceed to implementation.

### Step 8 — Implement and commit

Use `apply_diff` or `write_file` to apply each surviving change to the affected files.

Branch off from the **PR's head branch** (not `main`):

```bash
git fetch origin
git checkout <pr-head-branch>
git checkout -b testability/<pr-head-branch>
```

Then stage and commit:

```bash
git add <changed files>
git commit -m "testability: <short description of barrier removed>

Barrier: <barrier ID from checklist>
Unblocks: <one-sentence description of the now-possible test>
PR: #<original PR number>"
```

One commit per barrier is preferred, but multiple barriers with the same root cause may be
grouped into a single commit. Push the branch:

```bash
git push origin testability/<pr-head-branch>
```

### Step 9 — Compose the PR body

Write a thorough analysis report to `/tmp/testability-pr-body.md` using `write_file`.

The report must contain the following sections:

```markdown
## Testability Analysis for PR #<N> — <original PR title>

### Problem context
<1–2 sentences from the linked issue (or human-provided description) explaining what
problem this PR solves and why it matters.>

### What the PR introduces
<Brief description of the behavioral change, derived from the diff.>

### Barriers identified

For each barrier:
#### Barrier <ID> — <title>

| | |
|---|---|
| **Location** | `<file>:<line range>` |
| **Barrier type** | <barrier ID with one-line description> |
| **Blocked test** | <the specific test that was impossible> |
| **Fix applied** | <the exact change made and why it is the minimum needed> |
| **Now possible** | <the test that can now be written, in one sentence> |

### Why this improves testability
<1–2 paragraphs explaining the overall impact: what class of tests is now possible,
how this aligns with the project's existing test patterns from TESTING.md, and why
no larger refactor was needed.>

### Conventions followed
<Bullet list: which CONVENTIONS.md and TESTING.md rules were consulted and how they
shaped each fix. If a convention was absent and one was introduced, explain why.>

### Barriers not found / discarded
<List any barriers that were evaluated but discarded, with one-line reason each.
If no barriers were found at all, state that explicitly here.>
```

### Step 10 — Open the child PR

Call `execute_command` with:

```bash
gh pr create \
  --base <pr-head-branch> \
  --title "testability(#<N>): <short description of barriers removed>" \
  --body-file /tmp/testability-pr-body.md
```

The base must be the **original PR's head branch**, not `main`. This ensures the testability
fix is reviewed alongside the feature code it enables testing for.

If no barriers were found (and the gate check passed with zero surviving changes), do **not**
open a PR. Report:
> No testability barriers found in this diff. The behavior introduced can be observed,
> controlled, and isolated by an automated test without any production code change.

### Step 11 — Final summary

Print a structured summary to the chat:

```
## testability-prep — run complete

Original PR:        #<N> <title> (<URL>)
Linked issue:       #<issue-N> <title>  (or: "none found — human-provided context used")
Testability branch: testability/<original-branch>

### Barriers
  <barrier ID> — <file>:<lines> — <one-line description>  ✓ fixed
  (or: No barriers found)

### Child PR
  <URL> (or: not opened — no barriers found)

### Testability improvement metrics
  Barriers found:    <N>
  Barriers fixed:    <N>
  Barriers discarded: <N> (<one-line reason for each discarded barrier>)

  Observability gain:   <what can now be located/asserted that could not before>
  Controllability gain: <what can now be injected/substituted that could not before>
  Isolation gain:       <what is now reset/scoped per-test that was not before>
  Determinism gain:     <what is now deterministic that was not before>
                        (omit any axis where no improvement was made)

  Overall assessment: <one sentence — e.g. "Two time-coupling barriers removed; the
  PR's core logic is now fully unit-testable without real-clock dependency.">
```
