## PR Review — feat(skills): add testability-prep skill (#3)

**Author:** Edupizzol | **Base:** `main` ← `skill/testability` | **Changes:** +340 -0

### Summary

This PR introduces the `testability-prep` skill under `SKILLS/testability-prep/`. The skill is designed to analyze an already-approved PR's diff, identify barriers that prevent automated tests from observing, controlling, or isolating the changed behavior, and then apply the minimum production code change needed to remove each barrier. The addition includes `SKILL.md` (the step-by-step agent process), `README.md` (human-readable documentation with pipeline context), `seams-reference.md` (a detailed checklist of the five barrier types with minimal-fix and anti-pattern examples), and `testability-prep-plan.md` (the skill-forge plan artifact). The skill design is well-structured and the non-negotiable rule against unnecessary abstraction is a strong, clear constraint.

### Findings

#### 🔴 Blocking Issues

- `SKILLS/testability-prep/SKILL.md` — The `description:` field reads *"Analyzes the diff of an already-approved PR…"* but the skill convention requires it to start with an explicit trigger phrase such as `"Use /testability-prep to…"` or `"Use when a PR has been approved…"`. Without this phrasing, Bob cannot reliably auto-detect when to activate the skill. Fix: prefix the description with `"Use /testability-prep to analyze…"` or `"Use when a PR has been approved and needs to be prepared for test generation — analyzes…"`.

- `SKILLS/testability-prep/SKILL.md` (Step 2) — The instruction says *"Read the following files from the repository root, if they exist"* but does not name the Bob tool to use (`read_file`). Every step that performs an action must name the exact tool. Fix: add `"Call read_file on each path"` or `"Use glob to locate the file, then read_file to load it"`.

- `SKILLS/testability-prep/SKILL.md` (Step 3) — The instruction says *"consult seams-reference.md (in this skill's directory)"* but does not name the Bob tool needed to read it (`read_file`). Fix: add `"Call read_file on SKILLS/testability-prep/seams-reference.md"`.

- `SKILLS/testability-prep/SKILL.md` (Step 6) — The instruction says *"Apply the surviving changes on a new branch"* and *"Commit with a message…"* but does not name the tools required: `write_file` or `apply_diff` for applying code changes, and `execute_command` for the git branch/commit/push operations. Fix: add explicit tool calls, e.g. `"Use apply_diff or write_file to apply each change, then call execute_command with git checkout -b testability/<branch>, git add, and git commit"`.

- `SKILLS/testability-prep/SKILL.md` (Step 7) — The instruction says *"Open a PR against the original branch"* but does not name the tool (`execute_command` with `gh pr create`). Fix: add `"Call execute_command with gh pr create --base <original-branch> --title '…' --body-file /tmp/pr-body.md"`.

#### 🟡 Warnings

- `SKILLS/testability-prep/SKILL.md` — `metadata.disable-model-invocation: true` is missing from the frontmatter. This appears to be a command-style skill (`/testability-prep`) that should only run on explicit invocation, not auto-trigger. Add the field to the frontmatter block to prevent unintended activation.

- `SKILLS/testability-prep/SKILL.md` (Step 2) — The fallback path for when neither `TESTING.md` nor `CONVENTIONS.md` exists says *"scan existing *.test.*, *.spec.*, and *_test.* files"* but does not name how many files to scan or cap the breadth of the search. In large repositories this could exhaust context. Consider adding `"Use glob to find up to 3–5 representative test files and read_file with a line range rather than reading entire files"`.

- `SKILLS/testability-prep/SKILL.md` (Step 6) — The branching rule says *"One commit per barrier is preferred, but multiple barriers with the same root cause may be grouped"* but provides no guidance on what constitutes "same root cause". This leaves the grouping decision ambiguous during execution. A brief example or heuristic would close the gap.

#### 🟢 Info / Suggestions

- `SKILLS/testability-prep/SKILL.md` — No `metadata.argument-hint` is present in the frontmatter. The skill accepts a PR number, URL, or pasted diff as input. Adding `argument-hint: "[pr-number | url | diff]"` would improve the UX when the skill is invoked interactively.

- `SKILLS/testability-prep/SKILL.md` (Step 3) — The step instructs the agent to check every changed section against all five barrier types but does not suggest using `grep` on the diff text for quick signal detection (e.g. grepping for `time.Now()`, `Date.now()`, `Math.random()` to surface Barrier 2 candidates). Adding targeted grep hints would make execution faster and more deterministic.

- `testability-prep-plan.md` — This plan artifact documents assumptions and decisions well. Consider whether it belongs at the repository root or inside `SKILLS/testability-prep/` (alongside the skill files it describes) for discoverability. Placing it inside the skill directory keeps all skill-related context co-located.

### Verdict
❌ Blocking issues found — requesting changes.
