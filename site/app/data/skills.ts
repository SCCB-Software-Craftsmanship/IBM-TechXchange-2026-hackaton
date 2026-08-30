export interface SkillEntry {
  name: string
  kind: 'skill' | 'orchestrator' | 'workflow' | 'script'
  phase: string
  invocation: string
  summary: string
  output: string
  path: string
}

/* Every entry below maps to a real file in the repository. */
export const skills: SkillEntry[] = [
  {
    name: 'main',
    kind: 'orchestrator',
    phase: 'Onboarding',
    invocation: 'open orchestrate/main.orchestrate.md as a task',
    summary:
      'The single entry point for a fresh clone. Verifies gh auth, installs the skills, generates the knowledge files, then hands off to analyze-tests. Every phase is idempotent, so re-running is safe.',
    output: 'A fully prepared .bob/ directory',
    path: 'orchestrate/main.orchestrate.md',
  },
  {
    name: 'analyze-codebase',
    kind: 'skill',
    phase: 'Onboarding',
    invocation: '/analyze-codebase .bob',
    summary:
      'Scans the repository and writes six structured knowledge files. Detects first-run versus incremental mode from a .last-analyzed stamp and only rewrites what changed.',
    output: 'PROJECT · ARCHITECTURE · TESTING · DEPENDENCIES · CONVENTIONS · GLOSSARY',
    path: 'SKILLS/analyze-codebase/SKILL.md',
  },
  {
    name: 'analyze-tests',
    kind: 'orchestrator',
    phase: 'Onboarding',
    invocation: 'open orchestrate/analyze-tests.orchestrate.md as a task',
    summary:
      'Loads shared project context once in the parent agent, then dispatches two subagents in parallel with fork_context so the token cost of that context is paid exactly once instead of twice.',
    output: 'TEST-SUITES.md + HEURISTICS.md in one run',
    path: 'orchestrate/analyze-tests.orchestrate.md',
  },
  {
    name: 'scan-test-suites',
    kind: 'skill',
    phase: 'Onboarding',
    invocation: '/scan-test-suites',
    summary:
      'Reads the existing tests and describes how this suite is actually built — anatomy, file layout, setup and teardown, seam style, assertion vocabulary. Any observation without cited evidence is dropped rather than guessed.',
    output: '.bob/TEST-SUITES.md',
    path: 'SKILLS/scan-test-suites/SKILL.md',
  },
  {
    name: 'testability-heuristics',
    kind: 'skill',
    phase: 'Onboarding',
    invocation: '/testability-heuristics',
    summary:
      'Derives the barrier checklist for this specific repository across four dimensions — observability, controllability, isolation, determinism. It produces the barriers that are proven to exist here, not a filtered copy of a generic list.',
    output: '.bob/HEURISTICS.md — B1 … Bn',
    path: 'SKILLS/testability-heuristics/SKILL.md',
  },
  {
    name: 'testability-prep',
    kind: 'skill',
    phase: 'Per PR',
    invocation: 'bob -p "run testability-prep on PR #42"',
    summary:
      'Asks one question of every changed behaviour: what stops a test from observing, controlling or isolating this? It then applies the minimum production change that removes each real barrier — and if a change cannot name the test it unblocks, the change is not made.',
    output: 'A child PR against the feature branch',
    path: 'SKILLS/testability-prep/SKILL.md',
  },
  {
    name: 'generate-tests',
    kind: 'orchestrator',
    phase: 'Test generation',
    invocation: 'open orchestrate/generate-tests.orchestrate.md as a task',
    summary:
      'Claims the next unimplemented run from Cloudant, reads both the feature diff and the seam diff, splits the changed behaviour across the test pyramid, and spawns one subagent per layer to write tests that use the new seams.',
    output: 'One PR per layer + state advanced',
    path: 'orchestrate/generate-tests.orchestrate.md',
  },
  {
    name: 'review-pr',
    kind: 'skill',
    phase: 'Per PR',
    invocation: '/review-pr',
    summary:
      'The review checklist the team runs before a PR is approved — the gate that decides when testability-prep gets to start.',
    output: 'Structured review with severities',
    path: '.bob/skills/review-pr/SKILL.md',
  },
  {
    name: 'testability-run-tracker',
    kind: 'workflow',
    phase: 'Tracking',
    invocation: 'gh workflow run testability-run-tracker.yml',
    summary:
      'Persists a new TestabilityRun to Cloudant once testability-prep finishes. Runs as a GitHub Action so Cloudant credentials stay in repository secrets and never touch a developer machine.',
    output: 'One document, state tests_not_yet_implemented',
    path: '.github/workflows/testability-run-tracker.yml',
  },
  {
    name: 'testability-run-query',
    kind: 'workflow',
    phase: 'Tracking',
    invocation: 'gh workflow run testability-run-query.yml',
    summary:
      'Four modes — list-by-state, list-all, get and claim. Claim is the atomic one: it moves a run to tests_in_progress so two agents can never write tests for the same PR.',
    output: 'JSON array or document',
    path: '.github/workflows/testability-run-query.yml',
  },
  {
    name: 'cloudant scripts',
    kind: 'script',
    phase: 'Tracking',
    invocation: 'node scripts/cloudant/save.js list',
    summary:
      'The local CLI behind the workflows — bootstrap the database and indexes, create runs, transition state, list and get. Forward-only transitions are enforced in transitionRun, which throws on an illegal move.',
    output: 'Cloudant documents',
    path: 'scripts/cloudant/save.js',
  },
  {
    name: 'Cloudant IaC',
    kind: 'script',
    phase: 'Infrastructure',
    invocation: 'cd iac && tofu apply',
    summary:
      'OpenTofu configuration for the Cloudant instance and the IAM service key that GitHub Actions authenticates with. The instance is imported rather than recreated, so the state file matches what is already provisioned.',
    output: 'cloudant_url + github_actions_api_key',
    path: 'iac/*.tf',
  },
]

export const kindMeta: Record<SkillEntry['kind'], { label: string; tone: string }> = {
  skill: { label: 'Bob skill', tone: 'brand' },
  orchestrator: { label: 'Orchestrator', tone: 'violet' },
  workflow: { label: 'GitHub Action', tone: 'teal' },
  script: { label: 'Script / IaC', tone: 'neutral' },
}
