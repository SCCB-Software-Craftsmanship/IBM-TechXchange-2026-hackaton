export interface Member {
  name: string
  login: string
  role: string
  contributions: string
}

/* Handles and contribution counts resolved from the repository's
   contributors API; roles from the areas each person actually shipped. */
export const team: Member[] = [
  {
    name: 'Eduardo Jesus Dal Pizzol',
    login: 'Edupizzol',
    role: 'Testability & Infrastructure',
    contributions: 'testability-prep skill, Cloudant OpenTofu IaC, analyze-codebase evaluation',
  },
  {
    name: 'Pedro Druck Montalvão Reis',
    login: 'pedruck',
    role: 'Skills & Orchestration',
    contributions: 'testability-heuristics, scan-test-suites, analyze-tests & generate-tests orchestrators',
  },
  {
    name: 'Danrley Pereira',
    login: 'danrleypereira',
    role: 'Run Tracking & Contracts',
    contributions: 'TestabilityRun schema, GitHub Actions tracker workflows, HOWTOUSE agent contract',
  },
  {
    name: 'Paulo Vitor Gomes',
    login: 'gpaulovit',
    role: 'Review & Quality',
    contributions: 'review-pr skill, PR review checklist and skill-compliance checks',
  },
  {
    name: 'Leonardo Krauss',
    login: 'Leo3107',
    role: 'Context & Presentation',
    contributions: 'context-window handoff skill, this presentation layer',
  },
]

export const group = {
  name: 'SCCB — Software Craftsmanship Brasil',
  blurb:
    'A team of software-craftsmanship practitioners building for IBM TechXchange 2026. The bet: testability is not a review comment, it is a pipeline stage — so we taught an agent to run it.',
}
