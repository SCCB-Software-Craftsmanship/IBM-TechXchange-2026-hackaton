export const repoUrl = 'https://github.com/SCCB-Software-Craftsmanship/IBM-TechXchange-2026-hackaton'
export const orgUrl = 'https://github.com/SCCB-Software-Craftsmanship'

export const project = {
  name: 'Seamwork',
  codename: 'VibeBobbing',
  kicker: 'Testability as a pipeline stage',
  /* The hero headline is split so one word can be set in serif italic. */
  headline: { lead: 'Approved PRs arrive', accent: 'with their tests' },
  tagline: 'Approved PRs arrive with their tests',
  description:
    'Seamwork reads an approved PR for the things that block a test, opens a minimal seam PR to remove them, then writes the unit, integration and e2e suites the change was missing — one PR per pyramid layer, every run tracked in Cloudant.',
  ctaPrimary: { label: 'Get it working', href: '#setup' },
  ctaSecondary: { label: 'View on GitHub', href: repoUrl },
}

export const navItems = [
  { id: 'home', label: 'Home' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'metrics', label: 'Metrics' },
  { id: 'setup', label: 'Setup' },
  { id: 'github', label: 'GitHub' },
]
