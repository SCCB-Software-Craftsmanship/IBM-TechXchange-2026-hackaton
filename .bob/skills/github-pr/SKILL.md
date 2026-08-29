---
name: github-pr
description: Use when the user wants to open a pull request on GitHub — collects the base branch, title, and description, then creates the PR using the GitHub CLI (gh pr create).
metadata:
  argument-hint: "[optional PR title or target branch]"
---

# github-pr

Follow these steps in order every time this skill activates.

---

## Step 1 — Verify prerequisites

1. Check that the `gh` CLI is authenticated:
   ```bash
   gh auth status
   ```
   If the command fails or shows "not logged in", stop and tell the user to run `gh auth login`
   first.

2. Check the current branch and its upstream:
   ```bash
   git status --short --branch
   ```
   If the current branch is `main` or `master`, warn the user — a PR from the default branch is
   almost never intentional — and ask them to confirm before continuing.

---

## Step 2 — Determine the base branch

1. If the user specified a target/base branch, use it.
2. Otherwise, infer the default branch of the repository:
   ```bash
   gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
   ```
3. Confirm the base branch with the user if it was inferred (not explicitly given).

---

## Step 3 — Push the branch if needed

Check whether the current branch has an upstream:

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo "no-upstream"
```

If there is no upstream, push and set the upstream:

```bash
git push --set-upstream origin HEAD
```

---

## Step 4 — Collect PR metadata

Gather the following. Use values the user already supplied; ask only for what is missing.

| Field | How to determine |
|---|---|
| **Title** | User-supplied, or derive from the last commit message summary (`git log --oneline -1`). Confirm with the user before using the inferred value. |
| **Body** | User-supplied description, or auto-generate from `git log <base>..<branch> --oneline` — list the commits and briefly explain the purpose. |
| **Draft?** | Ask the user if the PR should be opened as a draft. Default: no. |
| **Reviewers** | Optional — only ask if the user mentions specific people. |
| **Labels** | Optional — only add if the repository has labels and the user mentions them. |

---

## Step 5 — Create the PR

Run `gh pr create` with the collected values:

```bash
gh pr create \
  --base <base-branch> \
  --title "<title>" \
  --body "<body>" \
  [--draft] \
  [--reviewer <handle>] \
  [--label <label>]
```

Use `--body-file -` with a here-doc if the body is multi-line, to avoid shell quoting issues:

```bash
gh pr create \
  --base <base-branch> \
  --title "<title>" \
  --body-file - <<'EOF'
<body text>
EOF
```

---

## Step 6 — Confirm

Print the PR URL returned by `gh pr create`. Tell the user the PR is open and on which base branch.
If the PR was opened as a draft, remind the user to mark it ready for review when appropriate.
