---
name: testability-prep
description: Use /testability-prep when a PR has been approved and needs to be prepared for test generation — checks the linked issue, reads project conventions, verifies the environment, analyzes the diff for testability barriers, applies the minimum production code change needed to remove each barrier, opens a child PR with a thorough analysis report, and creates two tracking issues.
---

# testability-prep

Given an already-approved PR (branch reference or pasted diff), this skill asks — for every
changed or new piece of behavior in the diff:

> What prevents an automated test from observing, controlling, or isolating this behavior?

It then makes the **minimum production code change** needed to remove each real barrier, opens
a child PR against the original branch with a thorough report, and creates two tracking issues.
If no barrier is found, no PR is opened but the tracking issues are still created.

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

### Step 1 — Verify the linked issue

1. Call `execute_command` with `gh pr view <number> --json closingIssuesReferences,title,body,headRefName,baseRefName`
   to retrieve the PR metadata.
2. Inspect `closingIssuesReferences`. If the array is **empty** (no linked issue found):
   - Do **not** proceed further.
   - Report to the human:
     > ⚠️ No linked issue found for PR #<number>. This skill requires a linked GitHub issue
     > describing the problem this PR solves. Please link an issue (via "Closes #N" in the PR
     > body or via the GitHub UI) and re-run.
   - **Stop here.**
3. If one or more issues are linked, call `execute_command` with
   `gh issue view <issue-number> --json title,body,labels` for each linked issue and record:
   - The problem being solved.
   - Any acceptance criteria or test requirements mentioned.
   - Labels that indicate issue type (bug, feature, etc.).

### Step 2 — Read established conventions and understand the project

Call `read_file` on each of the following, trying paths in order (stop at first hit per file):

**TESTING.md** (test framework, helper patterns, async utilities, teardown idioms):
- `.context/TESTING.md` → `.bob/TESTING.md` → `TESTING.md`

**DEPENDENCIES.md** (HTTP client, DB client, time/UUID utilities, async primitives, UI framework):
- `.context/DEPENDENCIES.md` → `.bob/DEPENDENCIES.md` → `DEPENDENCIES.md`

**CONVENTIONS.md** (selector/identifier convention, naming patterns, code style):
- `.context/CONVENTIONS.md` → `.bob/CONVENTIONS.md` → `CONVENTIONS.md`

If **none** of the above exist for a given file, fall back to direct inspection:
- `glob` with `**/*.test.*`, `**/*.spec.*`, `**/*_test.*` — pick up to 5 results and call
  `read_file` on each with range `1-80` to infer test framework and helpers.
- `glob` with `package.json`, `go.mod`, `requirements*.txt`, `Cargo.toml` — read to identify
  language and key dependency names.

Record what each file reveals. This context is used in every subsequent step.

### Step 3 — Verify the environment

Before touching any code, verify that the tools and dependencies required to run the project's
tests are present on the current machine.

1. From the test framework identified in Step 2, determine the required runtime
   (e.g. `go`, `node`/`pnpm`, `python`/`pytest`, `cargo`).
2. Call `execute_command` to probe each required tool:
   - Go: `go version`
   - Node/pnpm: `node --version && pnpm --version`
   - Python: `python --version` or `python3 --version`
   - Rust: `cargo --version`
3. Call `execute_command` to verify project dependencies are installed:
   - Go: `go mod verify`
   - Node/pnpm: check that `node_modules` exists in the relevant directory, or run
     `pnpm install --frozen-lockfile` if not present.
   - Python: check that the virtual environment or required packages are available.
4. **If any required tool is missing or dependencies cannot be installed**, abort:
   > ⚠️ Cannot proceed — required runtime/dependency not available: <tool name and version>.
   > Please install it and re-run.
   Do **not** make any code changes or open any PR.

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
<1–2 sentences from the linked issue describing the problem this PR solves.>

### What the PR introduces
<Brief description of the behavioral change, derived from the diff.>

### Barriers identified

For each barrier:
#### Barrier <ID> — <title>

| | |
|---|---|
| **Location** | `<file>:<line range>` |
| **Barrier type** | <A1–A9 or B1–BN with one-line description> |
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
Then proceed to Step 11 to create the tracking issues regardless.

### Step 11 — Create tracking issues

Create **two** GitHub issues on the repository using `gh issue create`.

#### Issue 1 — Testability run tracker (required)

This issue records the run in a machine-readable format so that a downstream agent can
discover which approved PRs still need test coverage written.

Generate a UUID for this run:

```bash
python3 -c "import uuid; print(uuid.uuid4())"
```

Then create the issue:

```bash
gh issue create \
  --title "testability-run: <UUID> — #<original-PR-number> <original-PR-title>" \
  --label "testability-run" \
  --body-file - <<'EOF'
## Testability Run Record

| Field | Value |
|---|---|
| **Run ID (UUID)** | <UUID> |
| **State** | `tests_not_yet_implemented` |
| **PR link** | <URL of the original approved PR> |
| **Testability PR** | <URL of the child PR opened in Step 10, or "none — no barriers found"> |
| **Barriers resolved** | <comma-separated list of barrier IDs, or "none"> |
| **Date** | <today YYYY-MM-DD> |

## Schema

```json
{
  "pk": "<UUID>",
  "state": "tests_not_yet_implemented",
  "pr_link": "<original PR URL>",
  "testability_pr_link": "<child PR URL or null>",
  "barriers_resolved": ["<B1>", "<B2>"]
}
```

## State transitions

| State | Meaning |
|---|---|
| `tests_not_yet_implemented` | Testability prep done; test generation not yet started |
| `tests_in_progress` | A test-generation agent is actively writing tests for this run |
| `tests_implemented` | All test layers have been written and the test PR merged |
| `tests_verified` | Tests pass in CI and coverage gate is satisfied |

## Notes

A downstream agent discovering this issue should:
1. Filter issues with label `testability-run` and state `tests_not_yet_implemented`.
2. Read the `PR link` to understand what feature or fix needs test coverage.
3. Read the `Testability PR` to understand which barriers were removed and what tests are now possible.
4. Update this issue's state to `tests_in_progress` before starting, to prevent duplicate work.
EOF
```

#### Issue 2 — CI/GitHub Actions environment tracker (nice to have)

This issue tracks whether the test suite can run cleanly in the GitHub Actions environment,
so that test generation work targets a verified execution context.

```bash
gh issue create \
  --title "ci-env: verify test suite runs in GitHub Actions for run <UUID>" \
  --label "ci-tracking" \
  --body-file - <<'EOF'
## CI Environment Verification

Linked to testability run: <UUID>
Original PR: <URL of the original approved PR>

### Purpose

When running test generation via watsonx.orchestrate and GitHub Actions, we need to confirm
that the test suite executes cleanly in the Actions environment before generated tests are
committed. This issue tracks that verification.

### Checklist

- [ ] Runtime version matches `TESTING.md` / `go.mod` / `package.json` `engines`
- [ ] All dependencies install without errors (`go mod verify` / `pnpm install --frozen-lockfile`)
- [ ] Existing test suite passes on the PR's head branch in Actions
- [ ] No environment-specific test skips (`SKIP_CONTAINER_TESTS`, `CI=true` guards) block the new tests
- [ ] Coverage upload (Codecov / similar) configured and reachable from Actions

### Resolution

Close this issue once a successful Actions run on the testability branch confirms the above.
EOF
```

After creating both issues, print their URLs in the chat summary.

### Step 12 — Final summary

Print a structured summary to the chat:

```
## testability-prep — run complete

Original PR:        #<N> <title> (<URL>)
Linked issue:       #<issue-N> <title>
Testability branch: testability/<original-branch>

### Barriers
  <barrier ID> — <file>:<lines> — <one-line description>  ✓ fixed
  (or: No barriers found)

### Child PR
  <URL> (or: not opened — no barriers)

### Tracking issues
  Issue 1 (run tracker): <URL>  run ID: <UUID>
  Issue 2 (CI tracker):  <URL>  (nice to have)
```
