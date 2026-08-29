---
name: git-commit
description: Use when the user wants to stage and commit changes to git — guides through reviewing staged/unstaged changes, writing a conventional commit message, and committing with the GitHub CLI or git.
metadata:
  argument-hint: "[optional message or scope hint]"
---

# git-commit

Follow these steps in order every time this skill activates.

---

## Step 1 — Inspect the working tree

Run the following commands and read their output before doing anything else:

```bash
git status --short
git diff --stat HEAD
```

If the working tree is clean (no changes), report that to the user and stop — do not create an
empty commit.

---

## Step 2 — Identify what to stage

1. List all unstaged and untracked files from the `git status` output.
2. If the user supplied a scope hint (e.g. "only the SKILLS/ changes"), stage only the matching
   paths:
   ```bash
   git add <path> [<path> ...]
   ```
3. If no hint was given and there are multiple unrelated change groups, ask the user which files
   or directories to include in this commit before staging anything.
4. If everything belongs together, stage all changes:
   ```bash
   git add .
   ```
5. Run `git diff --cached --stat` to confirm what is staged.

---

## Step 3 — Write the commit message

Follow the **Conventional Commits** format:

```
<type>(<optional scope>): <short imperative summary>

<optional body — explain *why*, not *what*>
```

**Type** — choose the most specific one that applies:

| Type | When to use |
|---|---|
| `feat` | A new feature or capability |
| `fix` | A bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructuring with no behaviour change |
| `test` | Adding or updating tests |
| `chore` | Tooling, config, dependencies, CI |
| `perf` | Performance improvement |

Rules:
- Summary line: ≤ 72 characters, imperative mood ("add", "fix", not "added", "fixes").
- Body: wrap at 72 characters; explain motivation and context, not the diff itself.
- If the change touches multiple types, pick the dominant one. Do not write multi-type summaries
  like `feat/fix: ...`.

---

## Step 4 — Commit

Run:

```bash
git commit -m "<summary line>" -m "<body paragraph (if any)>"
```

If the body is multi-paragraph, use multiple `-m` flags — one per paragraph.

---

## Step 5 — Confirm

Show the output of `git log --oneline -1` so the user can see the commit SHA and summary.
Report the branch name the commit landed on.
