import type { Run } from '../composables/useRuns'

/**
 * The 12-step procedure `testability-prep` runs on every approved PR.
 * Mirrors SKILLS/testability-prep/SKILL.md step-for-step — the commands
 * shown are the real ones the skill instructs Bob to run, not paraphrased.
 *
 * `evidence` reads the fields a specific TestabilityRun document actually
 * has and reports what that document proves about this step — never more
 * than the data supports. Steps 1-4 and 7 have no directly observable
 * trace in Cloudant, so they're marked implied rather than confirmed.
 */
export interface ProcessStep {
  id: number
  title: string
  commands: string[]
  evidence: (run: Run) => { tier: 'confirmed' | 'implied' | 'skipped'; note: string }
}

export const testabilityPrepSteps: ProcessStep[] = [
  {
    id: 1,
    title: 'Discover the linked issue',
    commands: [
      'gh pr view <number> --json closingIssuesReferences,title,body,headRefName,baseRefName,commits',
      'gh issue view <issue-number> --json title,body,labels',
    ],
    evidence: () => ({ tier: 'implied', note: 'Required before Step 5 can run — no direct record kept in Cloudant.' }),
  },
  {
    id: 2,
    title: 'Read established conventions',
    commands: ['read_file .bob/TESTING.md .bob/DEPENDENCIES.md .bob/CONVENTIONS.md'],
    evidence: () => ({ tier: 'implied', note: 'Context load — not recorded per-run.' }),
  },
  {
    id: 3,
    title: 'Verify the environment',
    commands: ['execute_command <test-runner> --version', '<package manager> install --dry-run'],
    evidence: () => ({ tier: 'implied', note: 'Gate check — only its pass/fail outcome is implied by the run existing.' }),
  },
  {
    id: 4,
    title: 'Get the PR diff',
    commands: ['gh pr diff <number>'],
    evidence: () => ({ tier: 'implied', note: 'Required input for Step 5 — not separately logged.' }),
  },
  {
    id: 5,
    title: 'Identify barriers',
    commands: ['read_file .bob/HEURISTICS.md'],
    evidence: (run) =>
      run.barriers.length
        ? { tier: 'confirmed', note: `Found ${run.barriers.length}: ${run.barriers.join(', ')}` }
        : { tier: 'confirmed', note: 'Ran — found no barriers that block a nameable test.' },
  },
  {
    id: 6,
    title: 'Propose the minimal fix',
    commands: ['(reasoning step — no tool call)'],
    evidence: (run) =>
      run.barriers.length
        ? { tier: 'confirmed', note: `One fix proposed per barrier (${run.barriers.length}).` }
        : { tier: 'skipped', note: 'Nothing to fix — no barriers survived Step 5.' },
  },
  {
    id: 7,
    title: 'Apply the non-negotiable rule (gate check)',
    commands: ['(reasoning step — no tool call)'],
    evidence: () => ({ tier: 'implied', note: 'Every surviving change passed this gate by definition.' }),
  },
  {
    id: 8,
    title: 'Implement and commit',
    commands: [
      'git checkout -b testability/<pr-head-branch> origin/<pr-head-branch>',
      'git commit -m "testability: <barrier removed>"',
      'git push origin testability/<pr-head-branch>',
    ],
    evidence: (run) =>
      run.testabilityPrLink
        ? { tier: 'confirmed', note: 'Real commits exist — see "What led into this PR" below.' }
        : { tier: 'skipped', note: 'No seam branch — no barriers to fix.' },
  },
  {
    id: 9,
    title: "Compose the PR body",
    commands: ['write_file /tmp/testability-pr-body.md'],
    evidence: (run) =>
      run.testabilityPrLink
        ? { tier: 'confirmed', note: 'Body is live on the child PR — see link below.' }
        : { tier: 'skipped', note: 'No child PR was opened.' },
  },
  {
    id: 10,
    title: 'Open the child PR',
    commands: ['gh pr create --base <pr-head-branch> --title "testability(#<N>): …" --body-file /tmp/testability-pr-body.md'],
    evidence: (run) =>
      run.testabilityPrLink
        ? { tier: 'confirmed', note: run.testabilityPrLink }
        : { tier: 'skipped', note: 'Skill explicitly skips this when zero barriers survive the gate.' },
  },
  {
    id: 11,
    title: 'Final summary',
    commands: ['(prints structured summary to chat)'],
    evidence: (run) =>
      run.summary
        ? { tier: 'confirmed', note: 'Stored verbatim in this run’s summary field.' }
        : { tier: 'implied', note: 'No summary text recorded on this document.' },
  },
  {
    id: 12,
    title: 'Save run to Cloudant',
    commands: ['gh workflow run testability-run-tracker.yml --field pr_link=… --field summary=…'],
    evidence: () => ({ tier: 'confirmed', note: 'This document is the proof — it would not exist otherwise.' }),
  },
]
