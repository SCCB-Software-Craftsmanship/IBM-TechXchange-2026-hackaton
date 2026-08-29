# analyze-codebase skill

## 1. What this skill does

`analyze-codebase` scans your entire codebase and generates six structured knowledge Markdown files
covering project purpose, architecture, testing, dependencies, conventions, and a domain glossary.
It then synthesises all six into a concise `AGENTS.md` file that Bob auto-loads at the start of
every conversation, so agents have immediate project context without re-analysing source code on
each iteration. Subsequent invocations are incremental: only the files whose tracked source patterns
have changed (per `source-map.md`) are regenerated, keeping updates fast.

---

## 2. Output files

All files are written to the `[output-path]` you supply at invocation.

| File | Description |
|---|---|
| `PROJECT.md` | Project purpose, high-level description, and entry points |
| `ARCHITECTURE.md` | Folder structure, module boundaries, data flow, and key design decisions |
| `TESTING.md` | Test frameworks, test types, coverage strategy, and how to run tests |
| `DEPENDENCIES.md` | External libraries, their versions, and why each is used |
| `CONVENTIONS.md` | Naming rules, code style, file organisation, and commit/PR conventions |
| `GLOSSARY.md` | Domain-specific terms used across the codebase (alphabetical) |
| `AGENTS.md` | Concise synthesis of all six files — auto-loaded by Bob in every conversation |
| `AGENTS-comparison.md` | Written **only** when an existing `AGENTS.md` is found; a structured gap report with a confidence score that serves as the quality/success metric for the skill's output |

---

## 3. Installation

This skill lives in `SKILLS/analyze-codebase/` — a custom tracking folder that is **not**
auto-detected by Bob. To make it available, copy it into Bob's skills directory:

```bash
cp -r SKILLS/analyze-codebase .bob/skills/
```

Then restart Bob or open a new conversation. The skill will be available as `/analyze-codebase`.

---

## 4. Usage

```
/analyze-codebase [output-path]
```

- `[output-path]` is optional at invocation — if omitted, Bob will prompt you for it.
- The path is relative to the workspace root and will be created if it does not exist.

**Example:**

```
/analyze-codebase docs/knowledge
```

---

## 5. Incremental updates

- **First run** — No `.last-analyzed` marker exists in `[output-path]`. All six knowledge files and
  `AGENTS.md` are generated from scratch.
- **Subsequent runs** — The skill reads `source-map.md` and compares the files changed since the
  `.last-analyzed` timestamp (via `git status`) against the source pattern mappings. Only the output
  files whose patterns have matching changes are regenerated. `AGENTS.md` is always re-synthesised
  if at least one knowledge file was updated.

---

## 6. Forcing a full regeneration

Delete the `.last-analyzed` marker file from the output directory, then re-run the skill:

```bash
rm [output-path]/.last-analyzed
```

```
/analyze-codebase [output-path]
```

The absence of `.last-analyzed` is the signal that triggers a full generation pass.

---

## 7. AGENTS.md and the success metric

The skill follows two different paths depending on whether an `AGENTS.md` already exists:

- **No existing `AGENTS.md`** — The skill writes one automatically alongside the six knowledge
  files. This is the standard outcome on first run in a fresh repository.
- **Existing `AGENTS.md` found** — The skill generates a candidate `AGENTS.md` in memory, performs
  a structured comparison against the existing file, and writes `AGENTS-comparison.md` to the
  output path. The existing `AGENTS.md` is never overwritten. `AGENTS-comparison.md` contains a
  confidence score (the percentage of candidate sections with a close equivalent in the existing
  file) and four structured diff sections: *In existing only*, *In candidate only*, *Matching
  coverage*, and *Diverging details*. A high confidence score indicates the skill is producing
  high-quality, accurate output.

---

## 8. File structure

```
SKILLS/analyze-codebase/
├── SKILL.md               ← Bob procedural instructions
├── README.md              ← this file
├── source-map.md          ← source pattern → output file mapping
└── templates/
    ├── PROJECT.md.tmpl
    ├── ARCHITECTURE.md.tmpl
    ├── TESTING.md.tmpl
    ├── DEPENDENCIES.md.tmpl
    ├── CONVENTIONS.md.tmpl
    ├── GLOSSARY.md.tmpl
    └── AGENTS.md.tmpl
```
