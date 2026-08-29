---
name: analyze-codebase
description: Use /analyze-codebase to scan the codebase and generate or update structured knowledge files (PROJECT.md, ARCHITECTURE.md, TESTING.md, DEPENDENCIES.md, CONVENTIONS.md, GLOSSARY.md, AGENTS.md).
metadata:
  disable-model-invocation: true
  argument-hint: "[output-path]"   # optional — defaults to .context
---

# analyze-codebase

Scan the codebase and generate (or incrementally update) a set of structured Markdown knowledge
files. Follow every step in order. Name the exact tool used at each action.

---

## Step 1 — Argument validation

1. Check whether an `[output-path]` argument was supplied with the `/analyze-codebase` command.
2. If an argument **was** provided, treat it as `OUTPUT_PATH` and proceed to Step 2.
3. If **no** argument was provided, set `OUTPUT_PATH` to `.context` and proceed to Step 2.
   Do **not** prompt the user — `.context` is the default.

---

## Step 2 — Run-mode detection

1. Call `read_file` on `<OUTPUT_PATH>/.last-analyzed`.
2. If the file **does not exist** (first run — `read_file` returns an error or empty result),
   proceed to **Step 3a — Full generation**.
3. If the file **exists** (incremental run), note its timestamp and proceed to
   **Step 3b — Incremental update**.

---

## Step 3a — Full generation (first run)

Process the six knowledge files in the order listed below. For each file, perform the three
sub-steps: **read template → explore codebase → write output**.

Process order: `PROJECT.md` → `DEPENDENCIES.md` → `ARCHITECTURE.md` → `CONVENTIONS.md` →
`TESTING.md` → `GLOSSARY.md`

### For each knowledge file

**Sub-step A — Read the template**

Call `read_file` on `SKILLS/analyze-codebase/templates/<FILE>.md.tmpl` to load the section
headings and inline guidance comments for that file.

**Sub-step B — Explore the codebase**

Use the source patterns listed in the table below as your exploration guide. Read
`SKILLS/analyze-codebase/source-map.md` once (before processing the first file) with `read_file`
to get the authoritative pattern list, then apply the patterns relevant to the current file.

| Output file | Primary exploration actions |
|---|---|
| `PROJECT.md` | `glob` for `README*`, `package.json`, `pyproject.toml`, `Cargo.toml`, `*.csproj`, `pom.xml`, `build.gradle*`. `read_file` each match found. |
| `DEPENDENCIES.md` | `read_file` on `package.json`, `requirements*.txt`, `Pipfile`, `Cargo.toml`, `pom.xml`, `build.gradle*`, lock files. |
| `ARCHITECTURE.md` | `list_files` on the workspace root (non-recursive) to map top-level structure. `list_files` on `src/`, `lib/`, `app/` if they exist. `glob` for `*.config.*`, `*.yaml`, `*.yml`. `read_file` key config files. |
| `CONVENTIONS.md` | `glob` for `.eslintrc*`, `.prettierrc*`, `.editorconfig`, `biome.json`, `pylintrc`, `.flake8`, `ruff.toml`, `CONTRIBUTING*`, `.github/**`. `read_file` each match. |
| `TESTING.md` | `glob` for `**/*.test.*`, `**/*.spec.*`, `jest.config.*`, `vitest.config.*`, `pytest.ini`, `cypress/**`, `playwright.config.*`. `read_file` config files. `grep` for the primary test runner in `package.json` scripts or `pyproject.toml`. |
| `GLOSSARY.md` | `grep` the `src/`, `tests/`, and `docs/` directories for domain-specific identifiers: type names, enum values, constants, and terms that appear repeatedly in comments or docstrings. Combine with terms already surfaced while writing the earlier five files. |

**Sub-step C — Write the output file**

Call `write_file` to write the fully populated Markdown to `<OUTPUT_PATH>/<FILE>.md`.
Replace every template comment (`<!-- … -->`) with real content from the codebase.
Do not leave any placeholder text in the output.

---

## Step 3b — Incremental update

1. Call `execute_command` with the command `git status --short` to obtain the list of changed,
   added, and deleted files in the workspace.
2. Call `read_file` on `SKILLS/analyze-codebase/source-map.md` to load the pattern-to-output
   mapping table.
3. For each file path returned by `git status --short`, match it against the source patterns in
   the source-map table (use glob-style matching; a path matches a pattern if it satisfies the
   pattern's glob expression).
4. Collect the distinct set of output files (`PROJECT.md`, `DEPENDENCIES.md`, `ARCHITECTURE.md`,
   `CONVENTIONS.md`, `TESTING.md`, `GLOSSARY.md`) whose source patterns were matched. These are
   the **stale files**.
5. If the stale set is **empty**, print "Everything is up to date." and skip to **Step 4**.
6. For each stale output file, follow the same **Sub-step A → B → C** flow described in Step 3a
   (read template → explore codebase → write output).

---

## Step 4 — AGENTS.md synthesis

Perform this step after all knowledge files have been written or confirmed up to date.

### 4.1 — Check for an existing AGENTS.md

1. Call `read_file` on `<OUTPUT_PATH>/AGENTS.md`.
2. If that fails, call `read_file` on `AGENTS.md` (project root).
3. Determine the outcome:
   - If **neither** file exists → follow **Path A** below.
   - If **either** file exists → note its full content and follow **Path B** below.

---

### Path A — No existing AGENTS.md (create it)

1. Call `read_file` on `SKILLS/analyze-codebase/templates/AGENTS.md.tmpl` to load the synthesis
   template.
2. Call `read_file` on each of the six knowledge files just written:
   `<OUTPUT_PATH>/PROJECT.md`, `<OUTPUT_PATH>/DEPENDENCIES.md`,
   `<OUTPUT_PATH>/ARCHITECTURE.md`, `<OUTPUT_PATH>/CONVENTIONS.md`,
   `<OUTPUT_PATH>/TESTING.md`, `<OUTPUT_PATH>/GLOSSARY.md`.
3. Synthesise a concise `AGENTS.md` using the template sections as the target structure.
   Target length: **100–150 lines** — dense but scannable. Prefer bullet points over prose.
   Every claim must be traceable to content in the six source files.
4. Call `write_file` to write the result to `<OUTPUT_PATH>/AGENTS.md`.

---

### Path B — Existing AGENTS.md found (comparison only)

1. Call `read_file` on `SKILLS/analyze-codebase/templates/AGENTS.md.tmpl`.
2. Call `read_file` on each of the six knowledge files:
   `<OUTPUT_PATH>/PROJECT.md`, `<OUTPUT_PATH>/DEPENDENCIES.md`,
   `<OUTPUT_PATH>/ARCHITECTURE.md`, `<OUTPUT_PATH>/CONVENTIONS.md`,
   `<OUTPUT_PATH>/TESTING.md`, `<OUTPUT_PATH>/GLOSSARY.md`.
3. **Generate a candidate AGENTS.md in memory only.** Do NOT call `write_file` for the candidate.
   Apply the same synthesis rules as Path A (100–150 lines, all claims traceable to source files).
4. Compare the candidate against the existing AGENTS.md **by content, not by structure**.
   Ignore section heading names and document layout — focus on whether each concrete *fact or claim*
   present in the candidate is reflected somewhere in the existing file, regardless of which section
   it appears in. Produce `AGENTS-comparison.md` with the following sections:

   ```
   ## Summary
   One paragraph describing overall content alignment between the candidate and the existing file.
   Do not comment on structural or section-layout differences.

   ## Confidence Score
   A percentage (0–100 %) representing the fraction of concrete facts/claims in the candidate
   that are covered — with equivalent meaning — anywhere in the existing file.
   Do NOT penalise for structural differences, section layout mismatches, or sections that exist
   in the existing file but not in the candidate template.
   Scoring guide:
     - Each fact in the candidate is either Covered (present in existing, possibly worded differently)
       or Missing (absent from existing).
     - Score = Covered / (Covered + Missing) × 100, rounded to the nearest 5 %.
   Briefly list the main reasons for any Missing facts.

   ## Testing Coverage Score
   A separate percentage for testing-specific facts only (frameworks, commands, test types,
   coverage strategy, known gaps). This is the primary quality signal.
   Apply the same Covered/Missing method as the overall score.

   ## Covered Facts
   Bullet list of facts/claims present in both files (content match, wording may differ).

   ## Missing from Existing
   Bullet list of facts in the candidate that are absent from the existing AGENTS.md. These are
   concrete gaps — the existing file does not cover them anywhere.

   ## In Existing Only
   Bullet list of significant facts in the existing AGENTS.md that the candidate does not cover.
   These typically represent human-authored workflow context not derivable from source code alone.
   Note: this section does NOT affect the Confidence Score.

   ## Recommendation
   One of:
   - "AGENTS.md is accurate — no changes needed."
   - "Update sections: <comma-separated list of content topics>."
   - "Full regeneration recommended — significant divergence detected."
   ```

5. Call `write_file` to write `AGENTS-comparison.md` to `<OUTPUT_PATH>/AGENTS-comparison.md`.
6. Do **NOT** modify or overwrite the existing `AGENTS.md` under any circumstance.

---

## Step 5 — Write the .last-analyzed marker

1. Determine the current UTC time in ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`.
   If `execute_command` is available, run `date -u +"%Y-%m-%dT%H:%M:%SZ"` to get the value;
   otherwise construct the timestamp from your internal knowledge of the current time.
2. Call `write_file` to write that timestamp string (and nothing else) to
   `<OUTPUT_PATH>/.last-analyzed`.

---

## Step 6 — Summary report

Print the following structured summary to the chat.

```
## analyze-codebase — run complete

Output directory: <OUTPUT_PATH>

### Knowledge files
  ✓ PROJECT.md        — written
  ✓ DEPENDENCIES.md   — written
  ✓ ARCHITECTURE.md   — written
  ✓ CONVENTIONS.md    — written
  ✓ TESTING.md        — written
  ✓ GLOSSARY.md       — written
  (Replace ✓ written with – skipped for any file that was not regenerated this run.)

### AGENTS.md
  <one of the following lines>
  ✓ AGENTS.md         — created at <OUTPUT_PATH>/AGENTS.md
  ✓ AGENTS-comparison.md — written (existing AGENTS.md was not modified)
  –  AGENTS.md         — skipped (already up to date)

### Marker
  ✓ .last-analyzed    — <timestamp>
```

If any file failed to write, replace `✓` with `✗` and append the error message inline.
```
