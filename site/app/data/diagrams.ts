export interface DiagramTab {
  id: string
  label: string
  caption: string
  source: string
}

/* Shared node styling. Light fills with dark text stay legible on both
   themes; edge/label colours come from mermaid themeVariables instead. */
const classDefs = `
  classDef trigger fill:#fff1f1,stroke:#da1e28,stroke-width:1.5px,color:#161616;
  classDef skill fill:#edf5ff,stroke:#0f62fe,stroke-width:1.5px,color:#161616;
  classDef orch fill:#e8daff,stroke:#8a3ffc,stroke-width:1.5px,color:#161616;
  classDef artifact fill:#f4f4f4,stroke:#8d8d8d,stroke-width:1.2px,color:#161616;
  classDef store fill:#d9fbfb,stroke:#009d9a,stroke-width:1.5px,color:#161616;
  classDef output fill:#defbe6,stroke:#0e8a76,stroke-width:1.5px,color:#161616;
`

const workflow = `flowchart TB
  start(["Fresh clone of the repo"]):::trigger

  subgraph ONB["Phase 1 · Onboarding — run once"]
    direction TB
    main["main.orchestrate.md"]:::orch
    install["scripts/install-skills.sh<br/>SKILLS/ &rarr; ~/.bob/skills"]:::artifact
    analyze["skill: analyze-codebase"]:::skill
    know[".bob/ PROJECT · ARCHITECTURE<br/>TESTING · DEPENDENCIES<br/>CONVENTIONS · GLOSSARY"]:::artifact
    atests["analyze-tests.orchestrate.md"]:::orch
    scan["skill: scan-test-suites"]:::skill
    heur["skill: testability-heuristics"]:::skill
    suites[".bob/TEST-SUITES.md"]:::artifact
    barriers[".bob/HEURISTICS.md<br/>barriers B1 … Bn"]:::artifact

    main --> install
    main --> analyze --> know --> atests
    atests -. "parallel subagents<br/>fork_context: true" .-> scan
    atests -. "parallel subagents<br/>fork_context: true" .-> heur
    scan --> suites
    heur --> barriers
  end

  subgraph PREP["Phase 2 · Per approved PR"]
    direction TB
    approved(["PR approved by a human"]):::trigger
    prep["skill: testability-prep"]:::skill
    found{"Barrier found<br/>in the diff?"}
    seam["Child PR — minimal seams<br/>injected clock, extracted fn, locator"]:::output
    reportonly["Child PR — report only<br/>no production change"]:::output
    tracker["testability-run-tracker.yml"]:::orch

    approved --> prep --> found
    found -- yes --> seam --> tracker
    found -- no --> reportonly --> tracker
  end

  subgraph GEN["Phase 3 · Test generation — on demand"]
    direction TB
    gen["generate-tests.orchestrate.md"]:::orch
    query["testability-run-query.yml<br/>mode=list-by-state &rarr; mode=claim"]:::orch
    diffs["Read PR diff + seam diff<br/>build behaviour inventory"]:::artifact
    unit["subagent · unit layer"]:::skill
    integ["subagent · integration layer"]:::skill
    e2e["subagent · e2e layer"]:::skill
    prs["One PR per pyramid layer<br/>base = feature branch"]:::output
    ci(["CI green + coverage gate"]):::trigger

    gen --> query --> diffs
    diffs -. "parallel" .-> unit
    diffs -. "parallel" .-> integ
    diffs -. "parallel" .-> e2e
    unit --> prs
    integ --> prs
    e2e --> prs
    prs --> ci
  end

  cloudant[("IBM Cloudant<br/>testability-runs<br/>provisioned by OpenTofu")]:::store

  start --> main
  suites -.-> prep
  barriers -.-> prep
  tracker == "state: tests_not_yet_implemented" ==> cloudant
  cloudant == "next unclaimed run" ==> gen
  query == "state: tests_in_progress" ==> cloudant
  prs == "state: tests_implemented" ==> cloudant
  ci == "state: tests_verified" ==> cloudant

${classDefs}`

const states = `stateDiagram-v2
  direction LR
  [*] --> tests_not_yet_implemented : testability-prep<br/>writes the run

  tests_not_yet_implemented --> tests_in_progress : generate-tests<br/>claims the run
  tests_in_progress --> tests_implemented : one PR opened<br/>per pyramid layer
  tests_implemented --> tests_verified : CI green +<br/>coverage gate
  tests_verified --> [*]

  note right of tests_not_yet_implemented
    Transitions are forward-only.
    transitionRun throws on any
    backwards or skipping move.
  end note

  note right of tests_in_progress
    Claiming is the lock — it stops
    two agents writing tests for
    the same PR.
  end note
`

export const diagrams: DiagramTab[] = [
  {
    id: 'workflow',
    label: 'Full workflow',
    caption:
      'Onboarding runs once per repository. Everything below it runs per approved PR, with Cloudant as the hand-off point between the two agents that never talk to each other directly.',
    source: workflow,
  },
  {
    id: 'states',
    label: 'Run state machine',
    caption:
      'Every TestabilityRun document walks these four states. The claim step is what makes parallel test-generation agents safe.',
    source: states,
  },
]
