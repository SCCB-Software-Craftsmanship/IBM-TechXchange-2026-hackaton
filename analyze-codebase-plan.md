# Plan: `analyze-codebase` Skill

## Overview

Build a Bob skill that scans the entire codebase and produces (or incrementally updates) a set of
structured Markdown knowledge files. The goal is to pre-compute a shareable, version-controlled
understanding of the project so that future agent interactions can load these files instead of
re-analysing source code from scratch.

**Invocation:** `/analyze-codebase [output-path]`
**Scope:** Workspace-only, stored in `SKILLS/analyze-codebase/` (custom tracking folder — must be
manually copied or symlinked to `.bob/skills/analyze-codebase/` to be Bob-detectable).
**Auto-invocation:** Disabled — runs only on explicit `/analyze-codebase` command.

### Output files (written to `[output-path]`)

| File | Content focus |
|---|---|
| `PROJECT.md` | Purpose, high-level description, entry points |
| `ARCHITECTURE.md` | Folder structure, module boundaries, data flow, key design decisions |
| `TESTING.md` | Test frameworks, test types, coverage strategy, how to run tests |
| `DEPENDENCIES.md` | External libraries, versions, why each is used |
| `CONVENTIONS.md` | Naming rules, code style, patterns, commit/PR conventions |
| `GLOSSARY.md` | Domain-specific terms used across the testing codebase |
| `AGENTS.md` | Concise synthesis of all 6 files — auto-loaded by Bob into every conversation |
| `AGENTS-comparison.md` | Gap report when an existing `AGENTS.md` is found — not overwritten |

### Incremental update logic

- **First run** (output path does not exist or contains no `.last-analyzed` marker): generate all
  6 files from scratch, then synthesise `AGENTS.md`.
- **Subsequent runs**: check git status and modification times against the `.last-analyzed` marker
  file; identify which source-file categories changed; regenerate only the affected output files;
  always re-synthesise `AGENTS.md` if any file was regenerated.

### AGENTS.md handling

- **No existing `AGENTS.md` found** in the output path or project root: generate and write it
  alongside the 6 knowledge files.
- **Existing `AGENTS.md` found**: generate a candidate in memory, diff it against the existing
  file, and write `AGENTS-comparison.md` to the output path. The existing `AGENTS.md` is never
  overwritten. `AGENTS-comparison.md` serves as the success metric — close alignment between the
  candidate and the human-written file indicates the skill is producing high-quality output.

---

## Sub-Task 1 — Scaffold the skill directory and supporting templates

**Intent**
Create the `SKILLS/analyze-codebase/` folder with a `templates/` sub-folder containing one
Markdown template per output file. Templates define the expected sections so output is consistent
across runs and projects.

**Expected Outcomes**
- `SKILLS/analyze-codebase/templates/PROJECT.md.tmpl`
- `SKILLS/analyze-codebase/templates/ARCHITECTURE.md.tmpl`
- `SKILLS/analyze-codebase/templates/TESTING.md.tmpl`
- `SKILLS/analyze-codebase/templates/DEPENDENCIES.md.tmpl`
- `SKILLS/analyze-codebase/templates/CONVENTIONS.md.tmpl`
- `SKILLS/analyze-codebase/templates/GLOSSARY.md.tmpl`
- `SKILLS/analyze-codebase/templates/AGENTS.md.tmpl`

Each template contains the headings and brief instructions (as HTML comments) that guide the model
when populating that file.

**Todo List**
1. Create `SKILLS/analyze-codebase/templates/` directory.
2. Write `PROJECT.md.tmpl` with sections: Overview, Purpose, Entry Points, Key Contacts / Owners.
3. Write `ARCHITECTURE.md.tmpl` with sections: Folder Structure, Module Boundaries, Data Flow,
   Key Design Decisions.
4. Write `TESTING.md.tmpl` with sections: Test Frameworks, Test Types & Taxonomy, Coverage
   Strategy, How to Run Tests, Known Gaps.
5. Write `DEPENDENCIES.md.tmpl` with sections: Runtime Dependencies, Dev Dependencies, Why Each
   Is Used, Version Constraints.
6. Write `CONVENTIONS.md.tmpl` with sections: Naming Rules, Code Style, File Organisation,
   Commit & PR Conventions, Linting / Formatting Tools.
7. Write `GLOSSARY.md.tmpl` with sections: Domain Terms (alphabetical table: Term | Definition |
   Where Used).
8. Write `AGENTS.md.tmpl` with sections: Project Summary, Architecture at a Glance, Testing
   Overview, Key Dependencies, Conventions Cheatsheet, Glossary Highlights. Target length: 100–150
   lines — dense but scannable.

**Relevant Context**
- No existing templates in the workspace — create from scratch.
- Templates are static files read by the skill instructions at activation; they are not processed
  by a script.

**Status:** [ ] pending

---

## Sub-Task 2 — Write the source-map reference file

**Intent**
Create `SKILLS/analyze-codebase/source-map.md`, a reference document that maps each output file
to the source file patterns that should trigger its regeneration. This is the decision table the
skill uses to determine which output files are stale on an incremental run.

**Expected Outcomes**
- `SKILLS/analyze-codebase/source-map.md` containing a table with columns:
  `Output File | Source Patterns | Rationale`

**Todo List**
1. Write `source-map.md` with the following mappings (patterns are glob-style):
   - `PROJECT.md` ← `README*`, `package.json`, `pyproject.toml`, `Cargo.toml`, `*.csproj`,
     `pom.xml`, `build.gradle*`
   - `ARCHITECTURE.md` ← any structural change: new/deleted directories, `src/**`, `lib/**`,
     `app/**`, configuration files (`*.config.*`, `*.yaml`, `*.yml`)
   - `TESTING.md` ← `**/*.test.*`, `**/*.spec.*`, `tests/**`, `**/__tests__/**`,
     `jest.config.*`, `pytest.ini`, `vitest.config.*`, `cypress/**`, `playwright.config.*`
   - `DEPENDENCIES.md` ← `package.json`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`,
     `requirements*.txt`, `Pipfile*`, `Cargo.toml`, `Cargo.lock`, `*.csproj`, `pom.xml`,
     `build.gradle*`
   - `CONVENTIONS.md` ← `.eslintrc*`, `.prettierrc*`, `.editorconfig`, `biome.json`,
     `pylintrc`, `.flake8`, `ruff.toml`, `CONTRIBUTING*`, `.github/**`
   - `GLOSSARY.md` ← broad: `src/**`, `tests/**`, `docs/**` (re-run if any domain code changes)

**Relevant Context**
- This file is referenced by the SKILL.md instructions — it is read at activation, not executed.

**Status:** [ ] pending

---

## Sub-Task 3 — Write the core SKILL.md

**Intent**
Write the main `SKILLS/analyze-codebase/SKILL.md` file. This is the procedural script Bob follows
when the user invokes `/analyze-codebase [output-path]`. It must implement both the first-run
(full generation) and incremental (diff-aware) workflows.

**Expected Outcomes**
- `SKILLS/analyze-codebase/SKILL.md` with correct YAML frontmatter (name, description, metadata)
  and a step-by-step body that:
  1. Validates the output-path argument (prompt user if missing).
  2. Checks for an existing `.last-analyzed` marker in the output path.
  3. On first run: reads the templates and generates all 6 knowledge files.
  4. On incremental run: runs `git status --short` and compares to source-map.md to identify
     stale output files; regenerates only those.
  5. Synthesises `AGENTS.md`: checks if one already exists in the output path or project root;
     if not, writes it; if yes, generates a candidate, diffs it, and writes `AGENTS-comparison.md`.
  6. Writes a `.last-analyzed` timestamp file after completion.
  7. Reports which files were written, which were skipped, and the AGENTS.md outcome.

**Todo List**
1. Write YAML frontmatter:
   - `name: analyze-codebase`
   - `description`: trigger phrase for command-only invocation (kept deliberately narrow so
     auto-invocation never fires)
   - `metadata.disable-model-invocation: true` (command-only)
   - `metadata.argument-hint: "[output-path]"`
2. Write Step 1 — Argument validation: if no `[output-path]` argument, use
   `ask_followup_question` to prompt.
3. Write Step 2 — Run-mode detection: check if `[output-path]/.last-analyzed` exists using
   `read_file`; branch to full-generation or incremental path.
4. Write Step 3a — Full generation workflow: for each of the 6 files, read the corresponding
   template from `SKILLS/analyze-codebase/templates/`, explore the codebase with the relevant
   source patterns, and write the populated file to `[output-path]/`.
5. Write Step 3b — Incremental workflow: execute `git status --short` to get changed files;
   read `source-map.md`; determine which output files are affected; regenerate only those.
6. Write Step 4 — AGENTS.md synthesis:
   - Check if `AGENTS.md` exists at `[output-path]/AGENTS.md` or the project root using `read_file`.
   - If not found: read `AGENTS.md.tmpl`, synthesise from the 6 generated files, write to
     `[output-path]/AGENTS.md`.
   - If found: generate candidate AGENTS.md in memory; produce a structured diff with sections
     "In existing only", "In candidate only", "Matching coverage", and a confidence score
     (percentage of candidate sections with close existing equivalents); write to
     `[output-path]/AGENTS-comparison.md`.
7. Write Step 5 — Write `.last-analyzed` with ISO timestamp using `write_file`.
8. Write Step 6 — Summary report: list which files were written, which were skipped, and the
   AGENTS.md outcome (created / comparison written / skipped).

**Relevant Context**
- Templates location: `SKILLS/analyze-codebase/templates/`
- Source map: `SKILLS/analyze-codebase/source-map.md`
- `metadata.disable-model-invocation: true` is required for command-only behaviour.
- The body should name specific Bob tools (`read_file`, `write_file`, `glob`, `grep`,
  `execute_command`, `ask_followup_question`).

**Status:** [ ] pending

---

## Sub-Task 4 — Write a usage README for the skill folder

**Intent**
Add `SKILLS/analyze-codebase/README.md` explaining how to install the skill into Bob, how to
invoke it, and what each output file contains. This is the onboarding doc for any developer who
clones this repository.

**Expected Outcomes**
- `SKILLS/analyze-codebase/README.md` with sections:
  - Installation (how to copy/symlink to `.bob/skills/`)
  - Usage (`/analyze-codebase [output-path]`)
  - Output file descriptions
  - Incremental update logic explanation
  - How to force a full regeneration (delete `.last-analyzed`)

**Todo List**
1. Write `README.md` covering the four sections above.
2. Include a one-line install command: `cp -r SKILLS/analyze-codebase .bob/skills/`.

**Relevant Context**
- This file is documentation only — no Bob skill logic.

**Status:** [ ] pending

---

## Validation Checklist

- [ ] Skill name `analyze-codebase` matches directory name and regex `^[a-z0-9]+(-[a-z0-9]+)*$`
- [ ] `metadata.disable-model-invocation: true` is set (command-only, no auto-activation)
- [ ] All 7 templates exist under `templates/` (including `AGENTS.md.tmpl`)
- [ ] `source-map.md` covers all 6 knowledge output files
- [ ] `.last-analyzed` logic correctly branches full vs incremental
- [ ] AGENTS.md synthesis step handles both "no existing file" and "existing file" cases
- [ ] `AGENTS-comparison.md` includes confidence score and structured diff sections
- [ ] `README.md` install instructions are accurate
