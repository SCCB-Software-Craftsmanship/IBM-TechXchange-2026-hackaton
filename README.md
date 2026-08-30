# VibeBobbing

**Testability is not a review comment. It is a pipeline stage.**

A pull request gets approved. Before it merges, an agent reads the diff and asks one question of
every changed behaviour: *what stops a test from observing, controlling, or isolating this?* It
removes what it finds with the smallest possible production change, records the run in IBM
Cloudant, and hands off to a second agent that writes the tests the change was missing.

Built for IBM TechXchange 2026 by [SCCB — Software Craftsmanship](https://github.com/SCCB-Software-Craftsmanship),
on top of IBM Bob.

**Live dashboard:** [site-six-blond-88.vercel.app](https://site-six-blond-88.vercel.app) — reads the real Cloudant database, no setup required to view it.

---

## Why

"Add tests before merging" is the most ignored review comment in software. Not because people
disagree, but because by the time anyone says it, the code is already shaped in a way that makes
testing expensive — a clock read inside a function body, a client constructed rather than passed,
a button with nothing a test can grab.

The fix is not more discipline. It is moving the question earlier and giving it to something that
never gets tired of asking.

## How it works

```mermaid
flowchart LR
  A(["PR approved by a human"]) --> B["skill: testability-prep"]
  B --> C{"Barrier found<br/>in the diff?"}
  C -- yes --> D["Child PR — minimum seams"]
  C -- no --> E["Child PR — report only"]
  D --> F[("IBM Cloudant<br/>testability-runs")]
  E --> F
  F --> G["orchestrator: generate-tests"]
  G --> H["One PR per pyramid layer<br/>unit · integration · e2e"]
  H --> I(["CI green + coverage gate"])
  I --> F
```

Three phases, one hand-off point:

1. **Onboarding — once per repository.** `analyze-codebase` writes down what the project already
   believes about testing. `scan-test-suites` and `testability-heuristics` then run in parallel to
   produce a description of the existing suite anatomy and a barrier checklist derived from *this*
   codebase's actual stack — not a generic list.

2. **Per approved PR.** `testability-prep` scans the diff against that checklist and opens a child
   PR against the feature branch. The run is written to Cloudant through a GitHub Action, so the
   database credentials never leave repository secrets.

3. **Test generation — on demand.** `generate-tests` claims the oldest unimplemented run, reads both
   the feature diff and the seam diff, splits the changed behaviour across the test pyramid, and
   opens one PR per layer.

The two agents never talk to each other. Cloudant is the seam between them.

### The rule that keeps it honest

> Do not introduce an abstraction, layer, interface, or dependency injection, and do not add
> test-only code to production, unless the current implementation demonstrably blocks a test
> required for the changed behaviour.

Every change `testability-prep` proposes must name, in one sentence, the test it unblocks. If it
cannot, the change is not made. Across the runs tracked so far that has meant **32 lines of
production change against 729 lines of feature code** — a 4.4% overhead for making it testable.

---

## Quick start

| Requirement | Why |
| --- | --- |
| IBM Bob | Runs the skills and orchestrators |
| `gh` CLI, authenticated | Every workflow is `workflow_dispatch` only |
| **Write access to this repo** | Not the same as being authenticated — `gh auth status` can pass while `gh workflow run` still fails with a permission error. Ask an org owner to add you as a collaborator (or to the GitHub Team that manages access). Nothing below works without this. |
| Node.js ≥ 22 | Cloudant CLI scripts and their tests |
| [OpenTofu](https://opentofu.org) ≥ 1.6 | Only if you provision your own Cloudant |

```bash
git clone https://github.com/SCCB-Software-Craftsmanship/IBM-TechXchange-2026-hackaton.git
cd IBM-TechXchange-2026-hackaton
npm ci
npm test
```

Authenticate and install the skills into your Bob context:

```bash
gh auth login
gh auth status
bash scripts/install-skills.sh
```

You do not need your own Cloudant credentials for any of the above — the tracker
and query workflows read `CLOUDANT_URL`/`CLOUDANT_API_KEY` from repository secrets,
never from anything in your clone. Credentials are only needed locally if you run
`scripts/cloudant/*.js` directly or run the site with live data (see `.env.example`).

Then run onboarding once, from inside Bob:

```
open orchestrate/main.orchestrate.md as a task
```

It verifies your environment, generates the `.bob/` knowledge files, and dispatches the two
analysis skills in parallel. Every phase is idempotent — re-running it on a prepared project
changes nothing.

Once a PR is approved:

```bash
bob -p "run testability-prep on PR #42"
```

Full command reference, including every workflow input and the end-to-end agent playbook, lives in
[`scripts/HOWTOUSE.md`](scripts/HOWTOUSE.md).

---

## What's in here

| Path | What it holds |
| --- | --- |
| [`SKILLS/`](SKILLS) | The four Bob skills, each with its own reasoning guide |
| [`orchestrate/`](orchestrate) | Parent-agent prompts that dispatch skills in parallel |
| [`scripts/cloudant/`](scripts/cloudant) | `TestabilityRun` schema, state machine and CLI |
| [`scripts/HOWTOUSE.md`](scripts/HOWTOUSE.md) | The agent-facing contract for every interface |
| [`.github/workflows/`](.github/workflows) | Tracker and query workflows — the only path to Cloudant |
| [`iac/`](iac) | OpenTofu configuration for the Cloudant instance and its IAM key |
| [`site/`](site) | Nuxt dashboard reading the same database |
| [`bob-sessions/`](bob-sessions) | Session evidence, one screenshot per task |

### The skills

| Skill | Produces |
| --- | --- |
| [`analyze-codebase`](SKILLS/analyze-codebase) | `PROJECT`, `ARCHITECTURE`, `TESTING`, `DEPENDENCIES`, `CONVENTIONS`, `GLOSSARY` |
| [`scan-test-suites`](SKILLS/scan-test-suites) | `TEST-SUITES.md` — suite anatomy, layout, seam and assertion style |
| [`testability-heuristics`](SKILLS/testability-heuristics) | `HEURISTICS.md` — the barrier checklist for this repository |
| [`testability-prep`](SKILLS/testability-prep) | A child PR removing the barriers it found |

Each skill enforces the same non-negotiable rule: every observation it writes must cite the
evidence in the project that confirms it. A dimension with no evidence produces no section.
Silence is correct.

---

## Run tracking

Every prepared PR becomes one document in the `testability-runs` Cloudant database. Transitions
are forward-only — [`transitionRun`](scripts/cloudant/testabilityRun.js) throws on any backwards
or skipping move.

```
tests_not_yet_implemented → tests_in_progress → tests_implemented → tests_verified
```

`tests_in_progress` is a claim, not a status. Claiming is atomic, which is what stops two
generation agents writing tests for the same pull request.

```bash
# what is waiting for tests?
gh workflow run testability-run-query.yml --ref main \
  --field mode=list-by-state --field state=tests_not_yet_implemented

# claim one
gh workflow run testability-run-query.yml --ref main \
  --field mode=claim --field id="<uuid>"
```

## The dashboard

**Live:** [site-six-blond-88.vercel.app](https://site-six-blond-88.vercel.app)

[`site/`](site) is a Nuxt application that reads the same documents the agents write — the pipeline
board, where each PR sits in the four states, and what each run changed.

```bash
cd site
npm install --legacy-peer-deps
npm run dev
```

It reads live Cloudant when `CLOUDANT_URL` and `CLOUDANT_API_KEY` are set, and falls back to a
bundled dataset otherwise. See [`site/README.md`](site/README.md) for which is which — the
distinction matters, and the dashboard states it on screen.

---

## Status

The pipeline has run against four pull requests across four repositories, including
[one on Memos](https://github.com/usememos/memos/pull/6214) — a 62k-star open-source project, not
our own code. Six barriers have been found and removed.

One run has completed the full lifecycle end to end — `tests_not_yet_implemented` through
`tests_verified` — with a real merged test PR on the other side of `generate-tests`. A second run
carries genuine `testability-prep` metrics (barriers found/fixed, not a placeholder) for the first
time; earlier runs predate that field and still show as unset rather than a guessed value. Test
coverage percentages are not tracked yet — only barrier and seam counts are, since that's what
`testability-prep` can honestly compute on its own.


## Why this solution fits the judging criteria

| Criterion | The strongest evidence |
| --- | --- |
| Completeness and feasibility | It has already run on a pull request in a 62,000-star open-source project we do not own |
| Creativity and innovation | It fixes testability *before* generating tests, instead of generating tests against untestable code |
| Design and usability | One command, output as a pull request; onboarding is once per repository and idempotent |
| Effectiveness and efficiency | 4.4% — the measured production-code cost of making four approved PRs testable |

---

### Completeness and feasibility

**This is not a prototype pointed at a toy repository.** The pipeline has run on four approved pull
requests across four repositories, and every run is a document in Cloudant right now:

| Pull request | Project | Barriers removed | Seam PR |
| --- | --- | --- | --- |
| [memos#6214](https://github.com/usememos/memos/pull/6214) | Memos — 62k-star OSS, not our code | B1 | `+16 / −0`, 6 files |
| [memos#5](https://github.com/SCCB-Software-Craftsmanship/memos/pull/5) | Memos fork | B1 | `+16 / −4`, 1 file |
| [maybe#1](https://github.com/SCCB-Software-Craftsmanship/maybe/pull/1) | Maybe — Rails | B4, B7 | fixed inline |
| [#7](https://github.com/SCCB-Software-Craftsmanship/IBM-TechXchange-2026-hackaton/pull/7) | This repository | B2, B3 | fixed inline |

The first row is the one that matters. That pull request was written by an outside contributor, in a
codebase nobody on this team has worked in. Bob read a diff none of us wrote, found what blocked a
test, and opened the fix.

**IBM technology is load-bearing, not decorative:**

- **IBM Bob** runs every skill and orchestrator — the whole pipeline is Bob skills, not a wrapper
  around a model API.
- **IBM Cloudant** is the run store *and* the architectural hand-off point between two agents that
  never communicate directly.
- **IBM Cloud IAM** issues the service key the GitHub Actions workflows authenticate with.
- The Cloudant instance and its IAM key are **OpenTofu-managed** in [`iac/`](iac) — reproducible
  infrastructure, not resources clicked together in a console.

**On feasibility in a real team:** onboarding is idempotent, so re-running it on a prepared project
changes nothing. Cloudant credentials live in repository secrets and never reach a developer machine —
every workflow is `workflow_dispatch` only. State transitions are forward-only and enforced in code:
[`transitionRun`](scripts/cloudant/testabilityRun.js) throws on any backwards or skipping move, and
that behaviour is covered by unit tests.

**What is not finished, stated plainly:** no run has yet reached `tests_implemented`. The generation
orchestrator is written and wired to the same database, but it has not yet produced a merged test
suite. We would rather show that gap than paper over it.

---

### Creativity and innovation

**Most AI testing tools generate tests against code as it is. That is the wrong order.** If the code
is not testable, the generated tests are either shallow or they mock so heavily that they assert
nothing about the behaviour that changed. You get a green suite and no signal.

We insert a stage *before* generation that asks what blocks a test and removes it first, so the
generation agent writes against seams that actually exist.

Three decisions make it work:

1. **A rule that constrains the agent, not just prompts it.**

   > Do not introduce an abstraction, layer, interface, or dependency injection, and do not add
   > test-only code to production, unless the current implementation demonstrably blocks a test
   > required for the changed behaviour.

   Every proposed change must name, in one sentence, the test it unblocks. If it cannot, the change
   is not made. This is what stops an agent refactoring a codebase simply because it can — the
   failure mode that makes teams distrust AI code changes.

2. **Evidence-gated analysis.** The barrier checklist is *derived* per repository from what is
   actually in it — its stack, its libraries, its existing test patterns — not filtered down from a
   fixed list. Any observation a skill cannot cite evidence for is dropped rather than guessed. A
   dimension with no evidence produces no section; silence is correct.

3. **A database as the seam between agents.** `testability-prep` and `generate-tests` never talk to
   each other. One writes a document, the other claims it atomically. Either can be rerun, replaced,
   or scaled independently without touching the other — and the claim is what makes running several
   generation agents at once safe.

---

### Design and usability

**For the engineer, the interface is one line:**

```bash
bob -p "run testability-prep on PR #42"
```

The output arrives as a pull request against the feature branch — reviewed in the place engineers
already review code, with no new tool to learn and no dashboard they are required to visit.

**Adoption cost is one onboarding run per repository**, and it is idempotent. There is no
configuration file to write or maintain, because the skills read the project's own conventions
instead of imposing ours. That is why the same pipeline ran unchanged across **three languages and
three test frameworks** — TypeScript/React, Ruby on Rails, and Node.js — with no per-repo setup.

**For everyone else, there is a dashboard.** [`site/`](site) is a Nuxt application reading the same
documents the agents write: a board showing where each pull request sits in the four states, which
barriers were removed, and the seam PR that removed them. A tech lead can answer "has this been
tested yet?" without reading a single log.

---

### Effectiveness and efficiency

**The problem is real and universally ignored.** "Add tests before merging" is the most common
unactioned comment in code review — not because anyone disagrees, but because by the time it is
said, the code is already shaped to make testing expensive. A clock read inside a function body. A
client constructed instead of passed. A button with nothing a test can grab. The fix is not more
discipline; it is moving the question earlier and giving it to something that never gets tired of
asking.

**The impact is measurable, and we measured it.** Across every run tracked so far: **32 lines of
production change against 729 lines of feature code — a 4.4% overhead** to make those changes
testable. That ratio is the argument. Testability is usually rejected on the assumption it means
large speculative refactors; here it is a number, taken from the real GitHub diffs.

**The pipeline is efficient in its own right.** The `analyze-tests` orchestrator loads shared project
context once in the parent agent and dispatches two subagents with `fork_context`, paying the token
cost of that context exactly once instead of twice. `generate-tests` spawns one subagent per test
pyramid layer, in parallel.

**It scales because nothing in it is specific to us.** Barriers are derived per repository, so a new
codebase needs no rules written for it — demonstrated across three unrelated projects in three
languages. Cloudant behaves as a work queue: add generation agents and throughput rises, while atomic
claiming guarantees two agents never write tests for the same pull request. The natural next step is
a `pull_request` trigger on approval, at which point no human has to remember to run anything at all.

## Team

| | Role |
| --- | --- |
| [@Edupizzol](https://github.com/Edupizzol) | Testability & infrastructure |
| [@pedruck](https://github.com/pedruck) | Skills & orchestration |
| [@danrleypereira](https://github.com/danrleypereira) | Run tracking & contracts |
| [@gpaulovit](https://github.com/gpaulovit) | Review & quality |
| [@Leo3107](https://github.com/Leo3107) | Context & presentation |

---

*Vai BOB!* 🤖
