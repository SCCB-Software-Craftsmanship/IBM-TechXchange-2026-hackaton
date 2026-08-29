---
name: review-pr
description: Use /review-pr to find, analyse, and post a structured review on an open GitHub pull request — covers skill format, CI/CD pipelines, MCP configs, and watsonx orchestration patterns
metadata:
  disable-model-invocation: true
---

# review-pr

Fetch an open GitHub pull request, analyse it against this project's domain-specific checklists,
and post a structured review comment via the `gh` CLI. Follow every step in order. Name the exact
tool used at each action.

This skill only reviews **open** PRs. Closed and merged PRs are out of scope.

---

## Step 1 — PR identification

Parse the user's invocation text and determine the target PR using one of three paths:

### Path A — Explicit reference (PR number or URL)

If the user provided a bare number (`42`), a `#`-prefixed number (`#42`), or a full GitHub PR URL
(`https://github.com/owner/repo/pull/42`):

1. Extract the PR number from the input.
2. Call `execute_command` with `gh pr view <number> --json number,title,state` to verify the PR
   exists and is open.
3. If the PR state is not `OPEN`, stop and tell the user:
   > "PR #<number> is not open (state: <state>). This skill only reviews open PRs."
4. If the PR is open, print a one-line acknowledgement:
   > "Reviewing PR #<number> — <title>."
5. Proceed directly to **Step 2** — no confirmation needed.

### Path B — Branch name or prose description

If the user provided a branch name (e.g. `feature/mcp-server`) or a prose description (e.g.
"the PR that adds the MCP server"):

1. Call `execute_command` with:
   `gh pr list --state open --json number,title,headRefName,url`
2. Match the user's text against the returned PR titles and `headRefName` branch names
   (case-insensitive substring match).
3. If **exactly one** PR matches:
   - Present it to the user using `ask_followup_question`:
     > "Found one matching open PR: #<number> — <title> (branch: `<headRefName>`). Is this the
     > right PR?"
   - Wait for explicit confirmation. If the user says no, ask them to clarify.
4. If **zero** PRs match, tell the user no open PR matched their description and ask them to
   provide a PR number or URL.
5. If **multiple** PRs match, list them and ask the user to pick one by number.
6. Once confirmed, proceed to **Step 2**.

### Path C — No signal

If the user typed `/review-pr` with no additional context:

1. Call `execute_command` with:
   `gh pr list --state open --json number,title,headRefName,url`
2. Display the list of open PRs as a numbered table.
3. Use `ask_followup_question` to ask the user which PR to review.
4. Once the user picks one, proceed to **Step 2**.

---

## Step 2 — Fetch PR data

1. Call `execute_command` with:
   `gh pr view <number> --json number,title,body,author,baseRefName,headRefName,url,additions,deletions`
   Store the result as the PR metadata object.

2. Call `execute_command` with `gh pr diff <number>` to get the full unified diff.
   Store the result as the diff text.

3. Call `execute_command` with `gh pr checks <number>` to get CI check statuses.
   If the command fails or returns no output, note "No CI checks found." and continue.

---

## Step 3 — Classify changed files

1. Parse every line in the diff text that matches the pattern `diff --git a/<path> b/<path>`.
   Extract the `<path>` value from each match to build the list of changed files.

2. Classify each file path into one or more categories:

   | Category | Match criteria |
   |---|---|
   | **Skill** | Path starts with `SKILLS/` or `.bob/skills/`; or filename is `SKILL.md` or is under a `templates/` directory |
   | **CI/CD** | Path matches `.github/workflows/*.yml`, contains `Jenkinsfile`, or matches `*pipeline*.yaml` |
   | **MCP** | Filename or directory segment contains `mcp` (case-insensitive); or is a JSON/YAML file whose diff content contains `"tools"`, `"resources"`, or `"prompts"` alongside `"name"` |
   | **Watsonx / orchestration** | Diff content for the file contains `watsonx`, `ibm-generative-ai`, or `wx.ai` |
   | **Scripts / tooling** | Path starts with `scripts/`, or filename is `Makefile`, `package.json`, `pyproject.toml`, or `Dockerfile` |
   | **Docs** | File ends in `.md` and is NOT named `SKILL.md` |

3. Build a classification map: `{ category → [file paths] }`.
   A single file may appear in more than one category.

4. If no file matches any category, set the classification map to empty and note
   "No recognized project-specific files changed." in the review summary.

---

## Step 4 — Category-specific analysis

For each category present in the classification map, apply the corresponding checklist below.
Collect every finding as: `{ severity, category, file, finding }`.
Severity levels: `blocking` | `warning` | `info`.

### Skill checklist

Apply to every file classified as **Skill**.

- `[blocking]` The `SKILL.md` diff contains a frontmatter block (`---`) with both `name:` and
  `description:` fields.
- `[blocking]` If the skill body references user arguments or optional parameters, a
  `metadata.argument-hint` field is present in the frontmatter.
- `[blocking]` The skill body contains numbered steps and each step names the exact Bob tool to
  call (look for tool names such as `write_file`, `read_file`, `execute_command`,
  `ask_followup_question`, `glob`, `grep`).
- `[warning]` No placeholder text (`TODO`, `FIXME`, `<fill this in>`, `...`) appears in the
  `SKILL.md` diff.
- `[warning]` A `README.md` file appears in the same diff or already exists in the same
  `SKILLS/<name>/` directory (check the diff for a sibling `README.md`).
- `[info]` If the `SKILL.md` diff references template files (e.g. calls `read_file` on a
  `.tmpl` path), verify that those template files are also present in the diff or already exist.

### CI/CD checklist

Apply to every file classified as **CI/CD**.

- `[blocking]` The diff includes an `on:` trigger block.
- `[blocking]` Every `jobs.<name>:` block includes a `runs-on:` field.
- `[blocking]` No plain-text credentials, tokens, or API keys appear as literal string values
  in the diff (scan for patterns like `password:`, `token:`, `api_key:`, `secret:` followed by
  a non-`${{` value).
- `[warning]` All `uses:` action references are pinned to a version tag or full commit SHA.
  Flag any reference ending in `@main`, `@master`, or `@latest`.
- `[warning]` All secret references use `${{ secrets.NAME }}` syntax. Flag any that appear to
  be hardcoded string values instead.
- `[info]` If multiple jobs exist and none declare `needs:`, note that parallelism/ordering
  may be worth reviewing.

### MCP checklist

Apply to every file classified as **MCP**.

- `[blocking]` The config diff contains a `name` field and at least one of `tools`, `resources`,
  or `prompts`.
- `[blocking]` No API keys or secret values appear as hardcoded string literals in the diff
  (scan for `"apiKey"`, `"api_key"`, `"token"`, `"secret"` followed by a non-variable value).
- `[warning]` Every tool, resource, and prompt definition in the diff includes a `description`
  field.
- `[warning]` A `transport` type (`stdio`, `http`, `sse`) is explicitly specified in the config.
- `[info]` Authentication config references environment variables (e.g. `process.env.X` or
  `${VAR}`) rather than inline values.

### Watsonx / orchestration checklist

Apply to every file classified as **Watsonx / orchestration**.

- `[blocking]` API keys and project IDs are loaded from environment variables, not hardcoded
  (scan for `WATSONX_API_KEY`, `IAM_APIKEY`, `project_id` as env-var references; flag any
  that appear as inline string literals).
- `[blocking]` No IBM Cloud credentials (CRNs, IAM keys, service credentials) appear as
  plain-text values in the diff.
- `[warning]` Model IDs are fully qualified (e.g. `ibm/granite-13b-chat-v2`,
  `meta-llama/llama-3-70b-instruct`). Flag any vague references like `"default"` or `"latest"`.
- `[warning]` Orchestration flow steps have descriptive names or inline comments explaining
  their purpose.
- `[info]` Agent tool definitions follow the patterns already established in the project
  (compare structure with any existing tool definitions visible in the diff context).

---

## Step 5 — Compose the review body

Build the following Markdown string in memory. Omit any `###` section whose content would be
empty (no findings in that severity tier).

```
## PR Review — <title> (#<number>)

**Author:** <author.login> | **Base:** `<baseRefName>` ← `<headRefName>` | **Changes:** +<additions> -<deletions>

### Summary
<One paragraph: describe what this PR does based on its title, body, and the categories of files
it touches. Be specific — name the categories and what changed within them.>

### Findings

#### 🔴 Blocking Issues
- `<file>` — <finding>
(Omit this section entirely if there are no blocking findings.)

#### 🟡 Warnings
- `<file>` — <finding>
(Omit this section entirely if there are no warnings.)

#### 🟢 Info / Suggestions
- `<file>` — <finding>
(Omit this section entirely if there are no info items.)

### CI Checks
<For each check returned by `gh pr checks`: "- <check name>: <status>".
If no checks were found, write "No CI checks found.">

### Verdict
✅ No issues found — approving.
— OR —
⚠️ Minor notes only — commenting without blocking.
— OR —
❌ Blocking issues found — requesting changes.
```

Select exactly one Verdict line based on the findings collected in Step 4:
- No findings of any severity → `✅ No issues found — approving.`
- Only `warning` and/or `info` findings → `⚠️ Minor notes only — commenting without blocking.`
- Any `blocking` finding → `❌ Blocking issues found — requesting changes.`

---

## Step 6 — Confirm and post

1. Print the full review body composed in Step 5 to the chat so the user can read it.

2. Use `ask_followup_question` to ask:
   > "Ready to post this review to PR #<number>. Confirm?"
   Provide "Yes, post it" and "No, cancel" as suggestions.
   Wait for explicit confirmation before proceeding.

3. If the user cancels, print "Review cancelled. Nothing was posted." and stop.

4. Determine the `gh pr review` event flag from the findings:
   - No findings of any severity → `--approve`
   - Only `warning` / `info` findings → `--comment`
   - Any `blocking` finding → `--request-changes`

5. Call `execute_command` with the following command, using `printf` to safely pass the
   multi-line review body:
   ```
   gh pr review <number> --<event> --body "$(printf '%s' '<escaped_review_body>')"
   ```
   Replace newlines and special characters in the body before embedding it in the command.
   Alternatively, write the review body to a temporary file first, then pass it via:
   ```
   gh pr review <number> --<event> --body-file /tmp/review-body.md
   ```
   Prefer the `--body-file` approach to avoid shell quoting issues with long multi-line content.

6. Print to chat:
   > `✓ Review posted: <url>`
