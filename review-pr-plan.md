# review-pr Skill — Plan

## Top-Level Overview

Create a new Bob skill `review-pr` under `SKILLS/review-pr/`, committed to the repository so the
whole team gets it when they clone. Team members install it locally by running
`scripts/install-skills.sh`, which copies it into their `~/.bob/skills/`. The skill is a
**developer productivity tool** — it is not part of the project's deliverable output, but it is
shared and versioned alongside the other team skills.

The skill has **no dependency on any other file in the repository at runtime** — it is entirely
self-contained in `SKILL.md`, calls only `gh` (GitHub CLI) and Bob's built-in tools, and reads
nothing from the workspace tree during execution.

The skill fetches an **open** GitHub pull request via the `gh` CLI, analyses it through the lens
of this project's domain (Bob skills, CI/CD pipelines, MCP configs, watsonx agent orchestration),
and posts a structured review comment directly on the PR using `gh pr review`.

Invocation is natural-language: the user types `/review-pr` followed by whatever context they
have (PR number, URL, branch name, description). The skill identifies the target PR from the list
of **open PRs only**, **always confirms with the user before proceeding**, then runs the review.

The review verdict is smart:
- **approve** — no issues of any severity found
- **comment** — only warnings / informational notes
- **request-changes** — one or more blocking issues detected

---

## Sub-Tasks

---

### Sub-task 1 — Write SKILL.md

**Intent**
Write the complete, self-contained procedural instructions that the Bob agent follows when
`/review-pr` is invoked. This is the entire skill — no supporting scripts or templates.

**Expected Outcomes**
- `SKILLS/review-pr/SKILL.md` exists with correct frontmatter and all 6 numbered steps
- Each step names the exact Bob tool to call
- The skill explicitly scopes to open PRs only
- The skill never proceeds to posting without user confirmation of the target PR

**Todo List**

1. Create `SKILLS/review-pr/SKILL.md` with the following frontmatter:
   ```yaml
   ---
   name: review-pr
   description: Use /review-pr to find, analyse, and post a structured review on an open GitHub pull request — covers skill format, CI/CD pipelines, MCP configs, and watsonx orchestration patterns
   metadata:
     disable-model-invocation: true
   ---
   ```
   Note: `disable-model-invocation: true` so the skill only runs when the user explicitly types
   `/review-pr`, preventing accidental auto-activation during unrelated PR discussions.

2. Write **Step 1 — PR identification**:
   - Parse the user's text for one of three signal types:
     - **Explicit reference** — a bare number (`42`), a `#`-prefixed number (`#42`), or a full
       GitHub PR URL (`https://github.com/owner/repo/pull/42`). When the user provides either of
       these, **skip confirmation and proceed directly to Step 2** after printing a one-line
       acknowledgement (e.g. "Reviewing PR #42 — <title>").
     - **Branch name or prose description** — e.g. `feature/mcp-server` or "the PR that adds the
       MCP server". Call `execute_command` with
       `gh pr list --state open --json number,title,headRefName,url` to get all open PRs, then
       match against branch names and titles. If exactly one PR matches, present it to the user
       and **wait for explicit confirmation** before continuing. If zero or multiple match, list
       the candidates and ask the user to pick one.
     - **No signal at all** — user typed `/review-pr` with nothing else. Call
       `gh pr list --state open --json number,title,headRefName,url`, display the list, and ask
       the user which PR to review.
   - In all cases: if the resolved PR number does not appear in the open PR list (i.e. it is
     closed or merged), stop and inform the user that this skill only reviews open PRs.

3. Write **Step 2 — Fetch PR data**:
   - Call `execute_command` with:
     `gh pr view <number> --json number,title,body,author,baseRefName,headRefName,url,additions,deletions`
   - Call `execute_command` with `gh pr diff <number>` to get the full unified diff.
   - Call `execute_command` with `gh pr checks <number>` to get CI check statuses
     (treat failure gracefully if the command is unavailable).

4. Write **Step 3 — Classify changed files**:
   - Parse file paths from `diff --git a/<path> b/<path>` headers in the diff output.
   - Classify each path into one or more of the following categories:
     - **Skill** — paths matching `SKILLS/**` or `.bob/skills/**` (especially `SKILL.md`,
       `README.md`, any `templates/` file)
     - **CI/CD** — paths matching `.github/workflows/*.yml`, `Jenkinsfile`, `*pipeline*.yaml`
     - **MCP** — paths containing `mcp` in name, or JSON/YAML files defining MCP server configs
     - **Watsonx / orchestration** — files referencing watsonx APIs, agent configs, or
       orchestration logic (scan diff content for `watsonx`, `ibm-generative-ai`, `wx.ai`)
     - **Scripts / tooling** — paths under `scripts/`, `Makefile`, `package.json`, etc.
     - **Docs** — `*.md` files that are not `SKILL.md`
   - Build a classification map: `{ category: [file paths] }`.
   - If no recognized category matches any file, proceed with an empty classification map and
     note this in the review summary.

5. Write **Step 4 — Category-specific analysis**:
   - For each category in the classification map, apply the checklist below. Collect findings as:
     `{ severity, category, file, finding }` where severity is `blocking | warning | info`.

   **Skill checklist** (any `SKILL.md` or `.bob/skills/**`)
   - `[ blocking ]` Frontmatter block present and contains `name` and `description` fields
   - `[ blocking ]` If the skill accepts user input, `argument-hint` is defined in metadata
   - `[ blocking ]` Steps are numbered and each names the exact tool to call (e.g. `write_file`,
     `execute_command`, `ask_followup_question`)
   - `[ warning  ]` No placeholder text (e.g. `TODO`, `<fill this in>`) left in instructions
   - `[ warning  ]` A `README.md` exists alongside the `SKILL.md`
   - `[ info     ]` If the skill references template files, verify those files are present in
     the diff or already exist

   **CI/CD checklist** (`.github/workflows/*.yml` or equivalent pipeline files)
   - `[ blocking ]` `on:` trigger block is present
   - `[ blocking ]` Every job has `runs-on` defined
   - `[ blocking ]` No credentials, tokens, or API keys appear as plain-text values in the diff
   - `[ warning  ]` All `uses:` action references are pinned to a version tag or commit SHA
     (flag any `@main`, `@master`, or `@latest`)
   - `[ warning  ]` Secrets are referenced via `${{ secrets.NAME }}` syntax only
   - `[ info     ]` Jobs that could run in parallel are structured with `needs:` dependencies

   **MCP checklist** (MCP server configs or source files)
   - `[ blocking ]` Config contains `name` and at least one of `tools`, `resources`, or `prompts`
   - `[ blocking ]` No API keys or secrets appear as hardcoded string values
   - `[ warning  ]` Every tool/resource/prompt definition has a `description` field
   - `[ warning  ]` Transport type (`stdio`, `http`) is explicitly specified
   - `[ info     ]` Auth config uses environment variable references

   **Watsonx / orchestration checklist**
   - `[ blocking ]` API keys and project IDs are loaded from environment variables, not hardcoded
   - `[ blocking ]` No IBM Cloud credentials appear as plain-text values in the diff
   - `[ warning  ]` Model IDs are fully qualified (e.g. `ibm/granite-13b-chat-v2`), not vague
   - `[ warning  ]` Orchestration flows have descriptive step names or comments
   - `[ info     ]` Agent tool definitions follow the patterns established in the existing project

6. Write **Step 5 — Compose the review body**:
   - Build a Markdown string with this exact structure:
     ```
     ## PR Review — <title> (#<number>)

     **Author:** <author> | **Base:** `<base>` ← `<head>` | **Changes:** +<additions> -<deletions>

     ### Summary
     <One paragraph describing what this PR does and which categories of files it touches.>

     ### Findings

     #### 🔴 Blocking Issues
     - `<file>` — <description>
     (Omit this section entirely if there are no blocking findings.)

     #### 🟡 Warnings
     - `<file>` — <description>
     (Omit this section entirely if there are no warnings.)

     #### 🟢 Info / Suggestions
     - `<file>` — <description>
     (Omit this section entirely if there are no info items.)

     ### CI Checks
     <List each check name and its status, or "No CI checks found." if the command failed.>

     ### Verdict
     ✅ No issues found — approving.
     — OR —
     ⚠️ Minor notes only — commenting without blocking.
     — OR —
     ❌ Blocking issues found — requesting changes.
     ```

7. Write **Step 6 — Confirm and post**:
   - Print the full review body to chat and ask the user: "Ready to post this review. Confirm?"
   - Wait for explicit confirmation before posting.
   - Determine the `gh` event flag from the findings:
     - Zero findings of any level → `--approve`
     - Only `warning` / `info` findings → `--comment`
     - Any `blocking` finding → `--request-changes`
   - Call `execute_command` with:
     `gh pr review <number> --<event> --body $'<review_body>'`
     (Use `$'...'` shell quoting to safely embed newlines and special characters.)
   - Print: `✓ Review posted: <PR URL>`

**Relevant Context**
- `SKILLS/analyze-codebase/SKILL.md` — reference for step format, tool-naming, prose style
- `scripts/install-skills.sh` — existing install script that picks up any new dir under `SKILLS/`
- Skill name `review-pr` matches regex `^[a-z0-9]+(-[a-z0-9]+)*$` ✓
- `disable-model-invocation: true` prevents the skill from auto-triggering during unrelated
  conversations that mention PRs

**Status** — [x] done

---

### Sub-task 2 — Write README.md

**Intent**
Provide a concise reference for team members who install and use this skill. The README is
a human-readable companion to `SKILL.md` — not a duplicate of it.

**Expected Outcomes**
- `SKILLS/review-pr/README.md` is complete
- Covers all review categories, verdict logic, requirements, and invocation examples

**Todo List**
1. Write the following sections in `SKILLS/review-pr/README.md`:
   - **What it does** — 2–3 sentence plain-English summary; mention open PRs only
   - **Requirements** — `gh` CLI installed and authenticated with repo read+write access
   - **Installation** — `./scripts/install-skills.sh` (picks up all skills including this one)
   - **Usage** — examples:
     - `/review-pr` — agent lists open PRs, user picks one
     - `/review-pr 42`
     - `/review-pr the PR that adds the MCP server`
     - `/review-pr https://github.com/owner/repo/pull/42`
   - **Review categories** — table: Category | Files matched | What is checked
   - **Verdict logic** — table: Verdict | Condition
   - **Notes** — confirmation required at two points (PR selection + before posting);
     only open PRs are supported

**Relevant Context**
- `SKILLS/analyze-codebase/README.md` — length and structure reference (~100 lines)

**Status** — [x] done

---

## Implementation Notes

- **Location:** `SKILLS/review-pr/` — committed to the repo alongside the other team skills.
  Team members run `./scripts/install-skills.sh` to copy it into `~/.bob/skills/`.
- **No repo dependencies at runtime:** the skill calls only `gh` (GitHub CLI) and Bob's built-in
  tools. It reads no files from the workspace tree during execution.
- **Two files only:** `SKILL.md` + `README.md`. No templates, no scripts, no source-map.
- **Open PRs only:** `gh pr list --state open` is always used. Closed/merged PRs are explicitly
  out of scope — the skill will tell the user if they try.
- **Pre-condition:** `gh` CLI must be authenticated (`gh auth status`). Documented in README;
  not handled inside the skill itself.
- **Confirmation gates:** two checkpoints — PR identification and before posting — to prevent
  accidental reviews.
