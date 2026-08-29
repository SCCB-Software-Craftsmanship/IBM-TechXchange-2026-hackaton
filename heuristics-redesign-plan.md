# Heuristics Redesign — Plan

## Top-Level Overview

The current `heuristics-reference.md` is a fixed checklist of 9 barrier types. The skill
translates them per-project but never questions whether the 9 are the right set. This causes
two problems: barriers are proposed for patterns that don't exist in the project (noise), and
real project-specific barriers that don't map to any of the 9 are silently missed (blindness).

The redesign changes the reference from a **checklist** into a **reasoning guide**. The skill
stops iterating over a fixed list and instead reads the project evidence first, then derives
only the barriers that are genuinely present. The output is the same `.bob/HEURISTICS.md` format
— but its contents are now grounded in what the project actually does.

**Nothing changes in `testability-prep` or the `.bob/HEURISTICS.md` format.**

---

## Sub-Task 1 — Rewrite `heuristics-reference.md` as a reasoning guide

**Intent**
Replace the fixed A1–A9 checklist with a document that teaches the skill *how to reason*
about testability from project evidence. It describes shapes of untestability problems, the
evidence that reveals each shape, and the minimum fix pattern — but it never says "check all
of these". The skill reads it as a thinking tool, not an instruction to run 9 checks.

**Expected Outcomes**
- `heuristics-reference.md` no longer contains a numbered list of barriers to iterate over.
- Instead, it contains **diagnostic dimensions** — broad categories of testability concern
  (observability, controllability, isolation, determinism) each with a set of *evidence
  patterns* and the shape of barrier they produce when found.
- Each evidence pattern has: what to look for in project context, what it signals, the
  minimum fix shape, and the "do not do" constraint.
- The document ends with an explicit instruction: "derive only the barriers you have evidence
  for — do not include a barrier because it is on a list".
- No Adaptation hint rows needed — the new format is already structured around evidence, not
  abstract placeholders.

**Todo List**
1. Define 4 diagnostic dimensions that cover all web project testability concerns:
   - **Observability** — can a test locate and read the output? (covers: UI locators, API
     contracts, event shapes)
   - **Controllability** — can a test supply a known input or substitute a dependency?
     (covers: I/O boundaries, time/randomness, config/env, async triggers)
   - **Isolation** — does the unit's behavior depend on state it doesn't own? (covers: global
     state, init side effects, shared fixtures)
   - **Determinism** — does the unit produce the same output for the same input every time?
     (covers: time, randomness, external state, network)
2. Under each dimension, list the evidence patterns that indicate a barrier exists. Each
   evidence pattern references what `analyze-codebase` would have recorded (e.g. "HTTP client
   found in DEPENDENCIES.md", "no contract file found in ARCHITECTURE.md").
3. For each evidence pattern, write: Signal (what you see in the diff), Minimum fix shape
   (abstract pattern), Do NOT do.
4. End the document with the derivation instruction: the skill must produce one barrier entry
   per evidence pattern it finds in the project — no more, no less.

**Relevant Context**
- Current `SKILLS/testability-heuristics/heuristics-reference.md` — content to restructure
  (the 9 barrier descriptions are still valid; they are being reorganized, not discarded).
- The 4 dimensions map cleanly: Observability → A1, A5; Controllability → A2, A3, A6, A8;
  Isolation → A7, A9, A4; Determinism → A2, A7 (overlaps are fine — a barrier can appear
  under multiple dimensions as evidence).

**Status** — `[x] done`

---

## Sub-Task 2 — Rewrite `testability-heuristics/SKILL.md`

**Intent**
Change the skill's step-by-step process from "for each of A1–A9, adapt or skip" to
"read the project evidence, then derive the barriers that exist here". The skill now uses
the reference as a reasoning tool: it reads the evidence dimensions, checks which ones have
signals in the project context, and produces one barrier entry per confirmed signal.

**Expected Outcomes**
- Step 2 (formerly "Load the universal reference") stays but is renamed "Load the reasoning
  guide" — framing matters.
- Step 3 changes completely: instead of iterating over 9 items, it reads the project context
  against each diagnostic dimension and asks "does this project have evidence of this shape
  of problem?" Only confirmed evidence produces a barrier entry.
- The generated `.bob/HEURISTICS.md` barriers are numbered locally (B1, B2, B3...) per
  project — not globally as A1–A9 — because the set is now project-derived.
- The "Skipped barriers" section is removed from the output format. If a barrier has no
  evidence, it simply doesn't appear — there is nothing to skip.
- The non-negotiable rule is strengthened: every barrier in the output must cite the specific
  evidence that confirmed it (e.g. "axios found in DEPENDENCIES.md", "no openapi.yaml found").

**Todo List**
1. Rename Step 2 to "Load the reasoning guide".
2. Replace Step 3 with evidence-driven derivation:
   - For each diagnostic dimension in the reference, check the context summary from Step 1.
   - A barrier is produced only if at least one concrete evidence item is present.
   - Each produced barrier must include an "Evidence" field naming what was found.
3. Update Step 4 (write output) to use local numbering (B1, B2...) and add the "Evidence"
   field to each barrier table row.
4. Remove the "Skipped barriers" section from the output template.

**Relevant Context**
- Current `SKILLS/testability-heuristics/SKILL.md` — Step 3 is the primary target.
- `.bob/HEURISTICS.md` format used by `testability-prep` — the added "Evidence" field is
  new but additive; `testability-prep` ignores unknown rows, so no downstream change needed.

**Status** — `[x] done`

---

## Sub-Task 3 — Update `README.md` to reflect the new design

**Intent**
The README currently describes the skill as translating "A1–A9". After the redesign it
derives project-specific barriers. The README must reflect that without going into
implementation detail.

**Expected Outcomes**
- README no longer lists A1–A9 as the fixed barrier set.
- Explains that the barrier count and content vary per project.
- The pipeline diagram stays the same.

**Todo List**
1. Replace the fixed barrier table with a one-paragraph explanation of the evidence-driven
   approach.
2. Update the "What this skill does" section to say "derives" rather than "translates".

**Relevant Context**
- `SKILLS/testability-heuristics/README.md` — lines 11-23 (the fixed table) are the target.

**Status** — `[x] done`

---

## Execution Order

1 → 2 → 3. Sub-task 2 depends on the new structure of the reference (Sub-task 1).
Sub-task 3 is independent but reads cleaner after 1 and 2 are done.
