# HOWTOUSE — Cloudant Workflows, Actions & Scripts

This document is the **agent-facing contract** for the testability run tracking system.
It describes every interface available — GitHub Actions workflows, local CLI scripts, and the
Cloudant document schema — so that any agent (or developer) can integrate without reading
source code.

---

## Table of contents

1. [Concepts](#concepts)
2. [TestabilityRun schema](#testabilityrun-schema)
3. [State machine](#state-machine)
4. [GitHub Actions workflows](#github-actions-workflows)
   - [testability-run-tracker — save a run](#testability-run-tracker--save-a-run)
   - [testability-run-query — query / claim runs](#testability-run-query--query--claim-runs)
5. [Local CLI scripts](#local-cli-scripts)
6. [End-to-end agent playbook](#end-to-end-agent-playbook)
7. [Prerequisites](#prerequisites)

---

## Concepts

| Term | Meaning |
|---|---|
| **TestabilityRun** | A Cloudant document created after `testability-prep` runs on an approved PR. It tracks the lifecycle of test generation for that PR. |
| **Barrier** | A testability obstacle found in the PR diff (e.g. missing seam, hardcoded dependency). Identified by ID (e.g. `B2`, `B3`). |
| **Child PR** | The PR opened by `testability-prep` that removes barriers. May be `null` if no barriers were found. |
| **Claim** | Transitioning a run to `tests_in_progress` to signal that an agent has started writing tests and prevent race conditions. |

---

## TestabilityRun schema

Every document stored in the `testability-runs` Cloudant database has the following shape:

```json
{
  "_id": "e54107c0-93ba-4da8-bef6-df278e6df76f",
  "_rev": "1-abc123...",
  "type": "testability-run",
  "state": "tests_not_yet_implemented",
  "pr_link": "https://github.com/SCCB-Software-Craftsmanship/IBM-TechXchange-2026-hackaton/pull/42",
  "testability_pr_link": "https://github.com/SCCB-Software-Craftsmanship/IBM-TechXchange-2026-hackaton/pull/43",
  "barriers_resolved": ["B2", "B3"],
  "summary": "Two time-coupling barriers removed; the PR's core logic is now fully unit-testable.",
  "created_at": "2026-08-30T05:04:40.657Z",
  "updated_at": "2026-08-30T05:04:40.657Z",
  "meta": {}
}
```

| Field | Type | Description |
|---|---|---|
| `_id` | UUID string | Stable identifier for this run — use this as `id` in all commands |
| `type` | `"testability-run"` | Discriminator — always this value |
| `state` | enum string | Current state (see state machine below) |
| `pr_link` | URL string | The original approved PR that was prepared |
| `testability_pr_link` | URL string or `""` | Child PR opened by `testability-prep`, or empty if no barriers found |
| `barriers_resolved` | string array | Barrier IDs fixed (e.g. `["B2","B3"]`), or `[]` |
| `summary` | string | "Overall assessment" sentence from `testability-prep` Step 11 |
| `created_at` | ISO 8601 | When the run was first saved |
| `updated_at` | ISO 8601 | When the state was last changed |
| `meta` | object | Optional extra key/value pairs (model version, skill version, etc.) |

---

## State machine

```
tests_not_yet_implemented
        │
        ▼
tests_in_progress          ← claim this state before starting to write tests
        │
        ▼
tests_implemented          ← test PR opened or committed
        │
        ▼
tests_verified             ← tests pass in CI, coverage gate satisfied
```

**Transitions are forward-only.** Attempting to move to a previous state throws an error.

---

## GitHub Actions workflows

> **Authentication:** All workflows are `workflow_dispatch` only. Only users/agents
> authenticated with `gh` CLI who have write access to this repository can trigger them.
> The Cloudant credentials are stored as repository secrets — runners never expose them.

### Prerequisites (GitHub Actions)

```sh
# Install the gh CLI Actions extension (one-time)
gh extension install github/gh-actions

# Verify authentication
gh auth status
```

---

### testability-run-tracker — save a run

**File:** `.github/workflows/testability-run-tracker.yml`
**Purpose:** Called by `testability-prep` (Step 12) to persist a new TestabilityRun after the skill completes. Creates one document with initial state `tests_not_yet_implemented`.

#### Inputs

| Input | Required | Description |
|---|---|---|
| `pr_link` | ✅ yes | URL of the original approved PR |
| `testability_pr_link` | no | URL of the child testability PR, or leave blank if none was opened |
| `barriers_resolved` | no | Comma-separated barrier IDs (e.g. `B2,B3`), or blank |
| `summary` | no | "Overall assessment" sentence from `testability-prep` Step 11 |

#### Usage

```sh
# Called automatically by testability-prep Step 12 — but can also be run manually:
gh workflow run testability-run-tracker.yml \
  --ref main \
  --field pr_link="https://github.com/SCCB-Software-Craftsmanship/IBM-TechXchange-2026-hackaton/pull/42" \
  --field testability_pr_link="https://github.com/SCCB-Software-Craftsmanship/IBM-TechXchange-2026-hackaton/pull/43" \
  --field barriers_resolved="B2,B3" \
  --field summary="Two time-coupling barriers removed; core logic is now fully unit-testable."

# Check result
gh run list --workflow=testability-run-tracker.yml --limit 1
gh run view <run-id> --log | grep "=== RESULT"
```

#### Output (job summary)

The Actions UI shows a table with the created document ID and initial state.

---

### testability-run-query — query / claim runs

**File:** `.github/workflows/testability-run-query.yml`
**Purpose:** Reads TestabilityRun records from Cloudant. Four modes — list, get, and claim.

#### Inputs

| Input | Required | Description |
|---|---|---|
| `mode` | ✅ yes | One of: `list-by-state`, `list-all`, `get`, `claim` |
| `state` | for `list-by-state` | State to filter by (default: `tests_not_yet_implemented`) |
| `id` | for `get` / `claim` | Document UUID (`_id` field) |

#### Modes

| Mode | What it does | Returns |
|---|---|---|
| `list-by-state` | All docs matching the given state | JSON array |
| `list-all` | All docs in the database | JSON array |
| `get` | Full document by UUID | JSON object |
| `claim` | Full document by UUID + transitions to `tests_in_progress` | JSON object (updated) |

#### Usage — find the next PR to write tests for

```sh
# 1. List all runs waiting for test generation
gh workflow run testability-run-query.yml \
  --ref main \
  --field mode=list-by-state \
  --field state=tests_not_yet_implemented

# 2. Wait for the run and get the output
RUN_ID=$(gh run list --workflow=testability-run-query.yml --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
gh run view "$RUN_ID" --log | grep -A 9999 "=== RESULT"
```

#### Usage — claim a run (atomic, prevents agent race conditions)

```sh
# Claim doc e54107c0-... — transitions it to tests_in_progress
gh workflow run testability-run-query.yml \
  --ref main \
  --field mode=claim \
  --field id="e54107c0-93ba-4da8-bef6-df278e6df76f"

# If already in tests_in_progress, the workflow warns and returns the doc unchanged
```

#### Usage — inspect a single run

```sh
gh workflow run testability-run-query.yml \
  --ref main \
  --field mode=get \
  --field id="e54107c0-93ba-4da8-bef6-df278e6df76f"
```

#### Usage — list everything

```sh
gh workflow run testability-run-query.yml \
  --ref main \
  --field mode=list-all
```

#### Job outputs (for downstream jobs)

| Output name | Content |
|---|---|
| `result` | Full JSON string — array or object depending on mode |
| `count` | Number of documents returned |

Use in a downstream job:
```yaml
jobs:
  query:
    uses: ./.github/workflows/testability-run-query.yml
    with:
      mode: list-by-state
      state: tests_not_yet_implemented
  next:
    needs: query
    steps:
      - run: echo '${{ needs.query.outputs.result }}'
```

---

## Local CLI scripts

All scripts live under `scripts/cloudant/` and require Node.js ≥ 22.
Credentials are read from `.env` (copy `.env.example` → `.env` and fill in).

```sh
# Install dependencies (one-time)
npm ci

# Bootstrap the database and indexes (idempotent — safe to run again)
node scripts/cloudant/bootstrap.js
```

### save.js — create, transition, list, get

```sh
# Create a new run
node scripts/cloudant/save.js create \
  --pr-link "https://github.com/.../pull/42" \
  --testability-pr-link "https://github.com/.../pull/43" \
  --barriers "B2,B3" \
  --summary "Two barriers removed."

# List all runs (optionally filter by state)
node scripts/cloudant/save.js list
node scripts/cloudant/save.js list --state tests_not_yet_implemented

# Get a single run by ID
node scripts/cloudant/save.js get --id "e54107c0-93ba-4da8-bef6-df278e6df76f"

# Transition state (forward-only — invalid transitions throw)
node scripts/cloudant/save.js transition \
  --id "e54107c0-93ba-4da8-bef6-df278e6df76f" \
  --state tests_in_progress
```

### Valid state values

```
tests_not_yet_implemented  →  tests_in_progress  →  tests_implemented  →  tests_verified
```

---

## End-to-end agent playbook

This is the full sequence an agent follows to discover, claim, and process a testability run.

### Step 1 — Discover

```sh
gh workflow run testability-run-query.yml \
  --ref main \
  --field mode=list-by-state \
  --field state=tests_not_yet_implemented

RUN_ID=$(gh run list --workflow=testability-run-query.yml --limit 1 \
  --json databaseId --jq '.[0].databaseId')
gh run watch "$RUN_ID" --exit-status
RECORDS=$(gh run view "$RUN_ID" --log | grep -A 9999 "=== RESULT" | tail -n +2)
echo "$RECORDS"
```

Parse `$RECORDS` — it is a JSON array. Pick the first element. Read:
- `id` — the document UUID needed for all subsequent commands
- `pr_link` — fetch this PR with `gh pr view <number>` to understand the feature
- `testability_pr_link` — fetch this PR with `gh pr diff` to see which barriers were removed
- `barriers_resolved` — list of barrier IDs to focus test coverage on
- `summary` — prose description of what testability-prep found

### Step 2 — Claim

```sh
gh workflow run testability-run-query.yml \
  --ref main \
  --field mode=claim \
  --field id="<id from Step 1>"
```

Wait for success before proceeding. If it warns "already in tests_in_progress", another agent
has claimed it — go back to Step 1 and pick the next record.

### Step 3 — Implement tests

Use the information from Step 1 to write tests:

```sh
# Read the original PR diff
gh pr diff <pr-number>

# Read the testability child PR diff (shows what barriers were removed)
gh pr diff <testability-pr-number>

# Read the PR body for context
gh pr view <pr-number> --json title,body,closingIssuesReferences
```

### Step 4 — Mark as implemented

When the test PR is opened:

```sh
node scripts/cloudant/save.js transition \
  --id "<id>" \
  --state tests_implemented
```

### Step 5 — Mark as verified

When tests pass in CI:

```sh
node scripts/cloudant/save.js transition \
  --id "<id>" \
  --state tests_verified
```

---

## Prerequisites

| Requirement | How to satisfy |
|---|---|
| `gh` CLI authenticated | `gh auth login` |
| `gh` Actions extension | `gh extension install github/gh-actions` |
| Write access to this repo | Required to trigger `workflow_dispatch` |
| Node.js ≥ 22 (local scripts only) | `node --version` |
| `.env` file (local scripts only) | `cp .env.example .env` and fill in `CLOUDANT_URL` + `CLOUDANT_API_KEY` |
