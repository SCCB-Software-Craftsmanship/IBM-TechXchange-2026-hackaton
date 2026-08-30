---
# This is an orchestration prompt, not a skill.
# disable-model-invocation: true
---

# generate-tests.orchestrate.md

> **This is a system prompt, not a skill.**
> It discovers the next unclaimed testability run from Cloudant, injects all
> available project context, generates tests layered by test pyramid, opens one
> PR per layer, and advances the run's state to `tests_implemented`.
>
> **Placeholders:** values wrapped in `{{DOUBLE_BRACES}}` are resolved at runtime
> by the steps in Phase 1. No placeholder should survive past Phase 2.

---

## What this prompt does

```
Cloudant (tests_not_yet_implemented)
        │
        ▼
Phase 1 — Discover & claim run      → resolves all {{PLACEHOLDERS}}
        │
        ▼
Phase 2 — Load project context      → .bob/ knowledge files + TEST-SUITES + HEURISTICS
        │
        ▼
Phase 3 — Read original PR + diffs  → understand what behavior needs testing
        │
        ▼
Phase 4 — Generate tests by layer   → parallel subagents, one per pyramid layer
        │
        ▼
Phase 5 — Open PRs by layer         → one PR per layer, base = feature branch
        │
        ▼
Phase 6 — Advance run state         → transition to tests_implemented in Cloudant
```

---

## Phase 1 — Discover and claim the next run

### 1.1 — List unclaimed runs

Call `execute_command` with:

```bash
gh workflow run testability-run-query.yml \
  --ref main \
  --field mode=list-by-state \
  --field state=tests_not_yet_implemented
```

Then wait for the workflow to finish and capture the JSON output:

```bash
RUN_ID=$(gh run list --workflow=testability-run-query.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
gh run view "$RUN_ID" --log | grep -A 99999 "=== RESULT"
```

Parse the JSON array. If it is empty, stop and report:
> ℹ️ No runs in state `tests_not_yet_implemented`. Nothing to generate.

BLOCK — do not proceed.

If there are multiple records, pick the one with the earliest `created_at`.

**Resolve placeholder:**
- `{{RUN_ID}}` ← `_id` field of the chosen record
- `{{PR_LINK}}` ← `pr_link` field
- `{{TESTABILITY_PR_LINK}}` ← `testability_pr_link` field (may be empty string)
- `{{BARRIERS}}` ← `barriers_resolved` array joined as comma-separated string
- `{{SUMMARY}}` ← `summary` field

### 1.2 — Claim the run (atomic)

Call `execute_command` with:

```bash
gh workflow run testability-run-query.yml \
  --ref main \
  --field mode=claim \
  --field id="{{RUN_ID}}"
```

Wait for the workflow and confirm the returned document has `state: tests_in_progress`.
If the document was already `tests_in_progress` (race condition), stop and report:
> ⚠️ Run `{{RUN_ID}}` was already claimed by another agent. Re-run this prompt to pick the next available run.

BLOCK — do not proceed.

### 1.3 — Extract PR numbers from links

From `{{PR_LINK}}`, extract the PR number:
```bash
echo "{{PR_LINK}}" | grep -oE '[0-9]+$'
```
**Resolve placeholder:** `{{ORIGINAL_PR_NUMBER}}` ← the extracted number.

If `{{TESTABILITY_PR_LINK}}` is non-empty, extract its PR number the same way.
**Resolve placeholder:** `{{TESTABILITY_PR_NUMBER}}` ← extracted number, or `""` if empty.

### 1.4 — Read the original PR metadata

Call `execute_command` with:

```bash
gh pr view {{ORIGINAL_PR_NUMBER}} \
  --json title,body,headRefName,baseRefName \
  --jq '{title:.title, body:.body, head:.headRefName, base:.baseRefName}'
```

**Resolve placeholders:**
- `{{ORIGINAL_PR_TITLE}}` ← `title`
- `{{ORIGINAL_PR_BODY}}` ← `body` (trimmed to first 400 chars if longer)
- `{{FEATURE_BRANCH}}` ← `headRefName`
- `{{BASE_BRANCH}}` ← `baseRefName`

---

## Phase 2 — Load project context

Load all knowledge files into this conversation window. Call `read_file` on each:

1. `.bob/TESTING.md` — test framework, runner command, helper patterns
2. `.bob/DEPENDENCIES.md` — libraries, assertion style, mocking libraries
3. `.bob/CONVENTIONS.md` — file naming, selector convention, code style
4. `.bob/ARCHITECTURE.md` — module structure, DI style, entry points
5. `.bob/TEST-SUITES.md` — existing test suite anatomy and conventions
6. `.bob/HEURISTICS.md` — project-specific testability barriers

If any of the first four files is missing, stop and report:
> ⚠️ `.bob/<file>` not found. Run `orchestrate/main.orchestrate.md` first to generate project context.

BLOCK — do not proceed.

If `TEST-SUITES.md` or `HEURISTICS.md` is missing, warn but continue:
> ⚠️ `.bob/TEST-SUITES.md` / `.bob/HEURISTICS.md` not found — proceeding without suite-specific guidance. Run `orchestrate/analyze-tests.orchestrate.md` to generate them.

---

## Phase 3 — Read the PR diffs

Use the following procedure for **each** PR you need to diff (apply it twice: once for the
feature PR, once for the testability PR if present). A merged PR returns an empty diff from
`gh pr diff` — the correct source is the merge commit.

### Diff procedure (apply per PR number)

1. Call `execute_command` to check the PR's merge state:

   ```bash
   gh pr view <PR_NUMBER> --json state,mergeCommit --jq '{state:.state, sha:.mergeCommit.oid}'
   ```

2. **If `state` is `"OPEN"` or `"CLOSED"` (not yet merged or closed without merge):**

   ```bash
   gh pr diff <PR_NUMBER>
   ```

3. **If `state` is `"MERGED"`** — `gh pr diff` returns empty. Use the merge commit instead:

   ```bash
   git diff <SHA>^1 <SHA>
   ```

   Where `<SHA>` is the `mergeCommit.oid` returned in step 1.
   `<SHA>^1` is the first parent — the commit on the base branch before the merge.

   If the merge commit SHA is empty (squash merge recorded differently), fall back to:

   ```bash
   gh pr view <PR_NUMBER> --json commits \
     --jq '[.commits[].oid] | last'
   ```

   Then diff that commit against its parent:

   ```bash
   git diff <LAST_COMMIT_SHA>^1 <LAST_COMMIT_SHA>
   ```

### 3.1 — Feature PR diff

Apply the diff procedure above to `{{ORIGINAL_PR_NUMBER}}`.
This is the source of truth for what behavior needs to be tested.

### 3.2 — Testability PR diff (if present)

If `{{TESTABILITY_PR_NUMBER}}` is non-empty, apply the diff procedure above to
`{{TESTABILITY_PR_NUMBER}}`.

This diff shows the seam changes (injected parameters, extracted functions) that make the
behavior testable. Understanding these changes is essential for writing tests that use the
new seams correctly.

### 3.3 — Build a behavior inventory

From the two diffs, produce an internal list of every new or changed behavior unit:

```
- <file>:<function/class> — <one-line description of what it does>
- ...
```

Group by test pyramid layer:
- **Unit** — pure functions, single-module logic, no I/O
- **Integration** — functions that cross a module boundary, use a real or stubbed dependency
- **E2E / contract** — full request-response or CLI invocation

A behavior unit may belong to multiple layers if it has meaningful tests at each level.
A behavior unit with no observable output (pure side-effect with no return value) belongs
to integration or e2e, not unit.

---

## Phase 4 — Generate tests by layer (parallel)

Issue one `spawn_subagent` per layer that has at least one behavior unit.
Run all subagents **in the same tool invocation turn** so they execute in parallel.
Set `fork_context: true` on every subagent — they inherit the full context loaded in
Phases 2 and 3.

Use only the layers that have entries in the behavior inventory from Phase 3.
Do not spawn a subagent for an empty layer.

### Subagent template (instantiate once per layer)

```
name: "general"
fork_context: true
description: |
  You are writing the {{LAYER}} test layer for PR #{{ORIGINAL_PR_NUMBER}}
  ("{{ORIGINAL_PR_TITLE}}").

  ## Context already loaded (do NOT re-read these files)
  The conversation history above contains:
  - .bob/TESTING.md, DEPENDENCIES.md, CONVENTIONS.md, ARCHITECTURE.md
  - .bob/TEST-SUITES.md (suite anatomy and conventions)
  - .bob/HEURISTICS.md (project-specific barriers)
  - Full diff of PR #{{ORIGINAL_PR_NUMBER}}
  - Full diff of testability PR #{{TESTABILITY_PR_NUMBER}} (if present)

  ## Behavior units assigned to this layer
  {{BEHAVIOR_UNITS_FOR_THIS_LAYER}}

  ## Your task
  1. For each behavior unit above, write tests that exercise it at the {{LAYER}} level.
  2. Follow EXACTLY the conventions in .bob/TEST-SUITES.md:
     - Use the same describe/it structure (or flat function style) as existing tests.
     - Place test files at the location prescribed by the File Layout section.
     - Name files using the naming convention in the File Layout section.
     - Use the same seam pattern (module mock / constructor injection / parameter default).
     - Use the same assertion vocabulary.
  3. Respect the barriers in .bob/HEURISTICS.md. If a barrier describes a seam that was
     added by the testability PR, use that seam — do not work around it differently.
  4. Write the test files using write_file. Do not modify any production source file.
  5. Confirm the tests can be run with the command in .bob/TESTING.md:
     Call execute_command with the test runner command scoped to the new files only.
     If the command fails, fix the tests (not the production code) and re-run.
  6. When all tests pass, report:
     - Files written (list each path)
     - Test count per file
     - Any barrier from HEURISTICS.md that directly shaped a test — cite the barrier ID
```

---

## Phase 5 — Open one PR per layer

After all subagents complete, for each layer that produced test files:

### 5.1 — Stage and commit

Call `execute_command`:

```bash
git checkout -b tests/{{LAYER}}/{{FEATURE_BRANCH}}
git add <test files written by the subagent for this layer>
git commit -m "test({{LAYER}}): add {{LAYER}} tests for PR #{{ORIGINAL_PR_NUMBER}}

Covers: {{BEHAVIOR_UNITS_FOR_THIS_LAYER_ONE_LINE_SUMMARY}}
Original PR: {{PR_LINK}}
Barriers used: {{BARRIERS}}"
git push --set-upstream origin tests/{{LAYER}}/{{FEATURE_BRANCH}}
```

### 5.2 — Write PR body

Write a body file to `/tmp/tests-{{LAYER}}-pr-body.md` using `write_file`:

```markdown
## {{LAYER}} tests for #{{ORIGINAL_PR_NUMBER}} — {{ORIGINAL_PR_TITLE}}

### What this PR tests
{{BEHAVIOR_UNITS_FOR_THIS_LAYER as bullet list}}

### Original PR
{{PR_LINK}}

### Testability PR (seams added)
{{TESTABILITY_PR_LINK or "No testability PR — no barriers were found."}}

### Barriers addressed
{{BARRIERS or "None — no testability barriers were identified for this PR."}}

### Conventions followed
- Test structure: <cite TEST-SUITES.md Anatomy section>
- File location: <cite TEST-SUITES.md File Layout section>
- Seam pattern: <cite TEST-SUITES.md Seam Patterns section>
- Assertion style: <cite TEST-SUITES.md Assertion Style section>

### Summary from testability-prep
{{SUMMARY}}
```

### 5.3 — Open the PR

Call `execute_command`:

```bash
gh pr create \
  --base {{FEATURE_BRANCH}} \
  --title "test({{LAYER}}): {{ORIGINAL_PR_TITLE}}" \
  --body-file /tmp/tests-{{LAYER}}-pr-body.md
```

Capture the PR URL returned. **Resolve placeholder:** `{{TEST_PR_URL_<LAYER>}}`.

---

## Phase 6 — Advance run state to tests_implemented

After all layer PRs are opened, call `execute_command`:

```bash
gh workflow run testability-run-query.yml \
  --ref main \
  --field mode=claim \
  --field id="{{RUN_ID}}"
```

Wait for the workflow, then call `execute_command` to do the final transition:

```bash
node scripts/cloudant/save.js transition \
  --id "{{RUN_ID}}" \
  --state tests_implemented
```

---

## Phase 7 — Final summary

Print:

```
## generate-tests — run complete

### Run claimed
  Cloudant ID:  {{RUN_ID}}
  Original PR:  {{PR_LINK}}
  Testability:  {{TESTABILITY_PR_LINK or "none"}}
  Barriers:     {{BARRIERS or "none"}}

### Tests generated
  <one line per layer>
  unit         — <N> test files, <N> tests  →  <TEST_PR_URL_unit>
  integration  — <N> test files, <N> tests  →  <TEST_PR_URL_integration>
  e2e          — <N> test files, <N> tests  →  <TEST_PR_URL_e2e>
  (omit layers with no tests)

### State transition
  tests_not_yet_implemented → tests_in_progress → tests_implemented  ✓

### Next step
  A reviewer merges the test PRs, runs CI, and when all pass:
  node scripts/cloudant/save.js transition --id "{{RUN_ID}}" --state tests_verified
```
