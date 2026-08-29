# review-pr

A Bob skill that fetches an **open** GitHub pull request, analyses it against this project's
domain-specific checklists, and posts a structured review comment directly on the PR via the
`gh` CLI. Designed for the team building this repo — covers skills, CI/CD pipelines, MCP server
configs, and watsonx agent orchestration patterns.

---

## Requirements

- [`gh` CLI](https://cli.github.com/) installed and authenticated with read + write access to
  the repository (`gh auth status` should show the correct account).
- Bob agent with `execute_command` and `ask_followup_question` tools available.

---

## Installation

From the repository root, run the shared install script — it copies all skills under `SKILLS/`
into `~/.bob/skills/`:

```bash
./scripts/install-skills.sh
```

The skill will be available as `/review-pr` in the **next** Bob session you open.

---

## Usage

Invoke the skill by typing `/review-pr` followed by any context you have about the PR. The agent
will identify the target, confirm if needed, run the analysis, and post the review.

| Invocation | Confirmation required? | Behaviour |
|---|---|---|
| `/review-pr 42` | No — proceeds immediately | Explicit PR number |
| `/review-pr #42` | No — proceeds immediately | Explicit PR number with `#` prefix |
| `/review-pr https://github.com/owner/repo/pull/42` | No — proceeds immediately | Full GitHub URL |
| `/review-pr the PR that adds the MCP server` | Yes — shows match, asks to confirm | Prose description matched against open PR titles |
| `/review-pr feature/mcp-server` | Yes — shows match, asks to confirm | Branch name matched against open PRs |
| `/review-pr` | Yes — lists open PRs, asks which | No signal provided |

The review body is always shown in chat before posting. A second confirmation is required before
the `gh pr review` command is executed.

---

## What it checks

| Category | Files matched | Checks |
|---|---|---|
| **Skill** | `SKILLS/**`, `.bob/skills/**`, `SKILL.md` | Frontmatter completeness, numbered steps with named tools, no placeholder text, sibling `README.md` present, template files exist |
| **CI/CD** | `.github/workflows/*.yml`, `Jenkinsfile`, `*pipeline*.yaml` | `on:` trigger, `runs-on` on every job, no hardcoded secrets, pinned action versions, `${{ secrets.X }}` syntax |
| **MCP** | Files with `mcp` in path, JSON/YAML configs with `tools`/`resources`/`prompts` | Required config fields, no hardcoded API keys, `description` on every tool, transport type specified |
| **Watsonx / orchestration** | Files containing `watsonx`, `ibm-generative-ai`, or `wx.ai` in diff | Env-var-only credentials, no IBM Cloud keys in plain text, fully qualified model IDs, descriptive step names |
| **Scripts / tooling** | `scripts/`, `Makefile`, `package.json`, `Dockerfile` | Reviewed under general findings — no dedicated checklist |
| **Docs** | `*.md` files (excluding `SKILL.md`) | Reviewed under general findings — no dedicated checklist |

---

## Verdict logic

The skill selects a GitHub review action based on findings from Step 4:

| Verdict | `gh` flag | Condition |
|---|---|---|
| ✅ Approve | `--approve` | Zero findings of any severity |
| ⚠️ Comment | `--comment` | Only `warning` and/or `info` findings |
| ❌ Request changes | `--request-changes` | One or more `blocking` findings |

---

## Notes

- **Open PRs only.** The skill always queries with `--state open`. If you provide a PR number or
  URL that points to a closed or merged PR, the skill will stop and tell you.
- **Two confirmation gates.** For ambiguous inputs (prose descriptions, branch names, or no
  input), the skill asks you to confirm the matched PR before fetching data. Regardless of how
  the PR was identified, the full review body is always shown in chat and requires a second
  explicit confirmation before it is posted to GitHub.
- **No repo files read at runtime.** The skill is entirely self-contained — it calls `gh` and
  Bob's built-in tools only. It does not read any files from the workspace tree during execution.
