---
name: testability-prep
description: Use /testability-prep when a PR has been approved and needs to be prepared for test generation — analyzes the diff and identifies what prevents an automated test from observing, controlling, or isolating the behavior it introduces, then makes the minimum production code change needed to remove that barrier.
---

# testability-prep

Given an already-approved PR (branch reference or pasted diff), this skill asks — for every
changed or new piece of behavior in the diff:

> What prevents an automated test from observing, controlling, or isolating this behavior?

It then makes the **minimum production code change** needed to remove each real barrier, and opens
a child PR against the original branch. If no barrier is found, no PR is opened.

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

### Step 1 — Get the PR diff

Obtain only what changed — not the whole repository. Use one of:

- `gh pr diff <number>` if a PR number was given.
- The pasted diff provided directly by the user.

Do not read files beyond the diff at this stage.

### Step 2 — Read established conventions

Call `read_file` on each of the following paths from the repository root, if they exist:

- `.bob/TESTING.md` or `TESTING.md` — learn the existing test framework, helper patterns,
  and any test-file conventions.
- `.bob/CONVENTIONS.md` or `CONVENTIONS.md` — learn the established selector convention and
  any other project-wide conventions.

If neither file exists, use `glob` with patterns `**/*.test.*`, `**/*.spec.*`, and
`**/*_test.*` to locate test files, then pick 3–5 representative results and call `read_file`
on each with a limited line range (e.g. `1-80`) — do not read entire files or scan more than
5 files. Infer the pattern from those samples before assuming no convention is in place.

### Step 3 — Identify barriers

Load the barrier checklist using the following three-tier lookup — use the first tier that
succeeds and skip the remaining tiers:

1. **Project-adapted checklist (preferred):** Call `read_file` on `.bob/HEURISTICS.md`.
   If the file exists, use it as the barrier checklist directly — it is already concretized
   for this project's stack and libraries. No further filtering or adaptation is needed.

2. **Universal reference (fallback):** Call `read_file` on
   `SKILLS/testability-heuristics/heuristics-reference.md`. If the file exists, apply
   lightweight filtering before scanning: for each barrier A1–A9, check whether the diff
   contains file types or patterns that could plausibly exhibit that barrier (e.g. skip A1
   if the diff contains no UI files; skip A6 if no async operations are visible). Use only
   the barriers that survive this check.

3. **Legacy checklist (last resort):** Call `read_file` on
   `SKILLS/testability-prep/seams-reference.md` and use it as-is.

With the checklist loaded, ask for every changed or new section in the diff:

> What prevents an automated test from observing, controlling, or isolating this behavior?

Only barriers that block a concrete, nameable test qualify. Record each barrier as:

- **Location** — file and line range in the diff.
- **Barrier type** — one of the barrier IDs from the loaded checklist (A1–A9 for the new reference, or one of the five types if using the legacy `seams-reference.md`).
- **Blocked test** — a one-sentence description of the specific test that is currently
  impossible without a fix.

Discard any entry where the "blocked test" field cannot be filled in concretely.

### Step 4 — Propose the minimal fix for each barrier

For each recorded barrier, propose the smallest change that makes the blocked test possible:

- Follow the repository's existing convention (from Step 2) for any selector or contract change.
- Do not restructure code beyond what is required to unblock the named test.
- Apply the non-negotiable rule: if the change cannot name the test it unblocks, discard it.

### Step 5 — Apply the non-negotiable rule (gate check)

Before touching any file, re-read the non-negotiable rule above. For each proposed change,
verify:

1. Does this change introduce an abstraction, layer, interface, or DI? If yes — is there a
   concrete named test that was previously blocked by the absence of this abstraction? If no
   such test can be named, discard the change.
2. Does this change add test-only code to production? If yes — is there a concrete named test
   that requires this production-side hook? If no, discard the change.

Only changes that survive this gate proceed to implementation.

### Step 6 — Implement and commit

Use `apply_diff` or `write_file` to apply each surviving change to the affected files. Then
call `execute_command` to create the branch, stage, and commit:

```
git checkout -b testability/<original-branch>
git add <changed files>
git commit -m "testability: <short description of barrier removed>

Unblocks: <one-sentence description of the now-possible test>"
```

One commit per barrier is preferred, but multiple barriers with the same root cause may be
grouped.

### Step 7 — Open or report

- **Barriers found and fixed:** Call `execute_command` with
  `gh pr create --base <original-branch> --title "testability: <short description>" --body-file /tmp/pr-body.md`
  (write the PR body to `/tmp/pr-body.md` using `write_file` first). The PR description must
  list each barrier resolved and, for each, one sentence explaining why the change was necessary
  to unblock a specific test. Do not include any change that is not listed in this description.
- **No barriers found:** Do not open a PR. Report explicitly:
  > No testability barriers found in this diff. The behavior introduced can be observed,
  > controlled, and isolated by an automated test without any production code change.
