# testability-prep — skill-forge plan

## Source

Issue text pasted directly in the chat (no GitHub URL supplied).

---

## Extracted fields

| Field | Value |
|---|---|
| **Slug** | `testability-prep` |
| **Description** | Analyzes the diff of an already-approved PR and identifies what prevents an automated test from observing, controlling, or isolating the behavior it introduces, then makes the minimum production code change needed to remove that barrier. Activate when a PR has been approved and needs to be prepared for test generation. |
| **Incremental?** | No — runs once per PR, scoped to that PR's diff only. |

### Instructions extracted

1. Get the PR's diff (not the whole repository — only what changed).
2. Read `TESTING.md` and `CONVENTIONS.md` from the repository, if they exist, to learn already-established conventions.
3. For every changed section, ask: "what prevents an automated test from observing, controlling, or isolating this behavior?" — using `seams-reference.md` as a checklist.
4. For each real barrier found, propose the smallest possible change, following the repository's existing convention.
5. Apply the non-negotiable rule: if a proposed change doesn't remove a concrete, nameable barrier, discard it.
6. If no barrier is found, do not open a PR — report this explicitly.
7. If barriers were fixed, open a PR against the original branch, with a description listing each barrier resolved and why the change was necessary.

### Support files

- `seams-reference.md` — checklist of the five barrier types with minimal-fix and anti-pattern examples. Consulted during Step 3 and Step 4.

### Templates

None. The skill does not generate output files from a fixed template structure.

---

## Assumptions

| Ambiguity | Interpretation chosen | Reason |
|---|---|---|
| The issue says "read `TESTING.md` and `CONVENTIONS.md`" but does not specify path. | Check both `.bob/TESTING.md` / `.bob/CONVENTIONS.md` and the repo root equivalents. | `analyze-codebase` may write to `.bob/` or the root; checking both avoids a silent miss. |
| "Optional parameter with a production default" (clock/randomness fix) — the issue gives a conceptual description without prescribing a specific language pattern. | `seams-reference.md` provides a Go variadic and a TypeScript default-param example, covering the two most common cases. Other languages follow the same principle. | The examples are illustrative, not exhaustive; agents can adapt the pattern to their language. |
| The issue says "open a PR" but does not specify the branch naming convention. | Named `testability/<original-branch>`. | Namespacing keeps testability branches visually distinct from feature branches in any PR list. |

---

## Files created

- [x] `SKILLS/testability-prep/SKILL.md`
- [x] `SKILLS/testability-prep/README.md`
- [x] `SKILLS/testability-prep/seams-reference.md`

---

## Skipped optional files

| File | Reason skipped |
|---|---|
| `source-map.md` | The skill is not incremental — it runs once per PR and has no staleness concept. |
| `templates/` | The skill does not generate output files from a fixed template. |
