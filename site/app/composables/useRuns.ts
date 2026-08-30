export interface RunMetrics {
  coverage: number
  testable_units: number
  open_barriers: number
  seams: number
  assertions: number
  suite_runtime_s: number
  tests: { unit: number; integration: number; e2e: number }
}

export interface Run {
  id: string
  state: string
  stageIndex: number
  prLink: string
  prNumber: number | null
  prTitle: string
  author: string | null
  branch: string | null
  testabilityPrLink: string | null
  barriers: string[]
  summary: string
  testPrs: Record<string, string>
  createdAt: string | null
  updatedAt: string | null
  timeline: Record<string, string>
  metrics: { before: RunMetrics; after: RunMetrics }
}

export interface RunsPayload {
  source: 'cloudant' | 'sample'
  error: string | null
  database: string
  fetchedAt: string
  states: string[]
  runs: Run[]
}

export const stageMeta: Record<string, { label: string; short: string; blurb: string }> = {
  tests_not_yet_implemented: {
    label: 'Tests not yet implemented',
    short: 'Queued',
    blurb: 'testability-prep has finished and written the run. Nobody has claimed it yet.',
  },
  tests_in_progress: {
    label: 'Tests in progress',
    short: 'Claimed',
    blurb: 'A generation agent holds the claim and is writing the layer suites.',
  },
  tests_implemented: {
    label: 'Tests implemented',
    short: 'PRs open',
    blurb: 'One PR per pyramid layer is open against the feature branch, waiting on review and CI.',
  },
  tests_verified: {
    label: 'Tests verified',
    short: 'Verified',
    blurb: 'CI is green and the coverage gate is satisfied. The run is closed.',
  },
}

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0)

/** Shared fetch — every section reads the same payload. */
export function useRuns() {
  const { data, pending, error, refresh } = useFetch<RunsPayload>('/api/runs', {
    key: 'testability-runs',
    default: () => ({
      source: 'sample' as const,
      error: null,
      database: 'testability-runs',
      fetchedAt: '',
      states: [],
      runs: [],
    }),
  })

  const runs = computed(() => data.value?.runs ?? [])

  /** Totals across every run, before and after the pipeline touched it. */
  const totals = computed(() => {
    const list = runs.value
    const fold = (side: 'before' | 'after') => {
      const m = list.map((r) => r.metrics[side])
      const units = sum(m.map((x) => x.testable_units))
      // Coverage is weighted by testable units so a docs-only run with zero
      // units cannot drag the average down.
      const weighted = sum(m.map((x, i) => x.coverage * (list[i]!.metrics[side].testable_units || 0)))
      return {
        coverage: units > 0 ? Math.round(weighted / units) : 0,
        testable_units: units,
        open_barriers: sum(m.map((x) => x.open_barriers)),
        seams: sum(m.map((x) => x.seams)),
        assertions: sum(m.map((x) => x.assertions)),
        suite_runtime_s: Number(sum(m.map((x) => x.suite_runtime_s)).toFixed(2)),
        tests: {
          unit: sum(m.map((x) => x.tests.unit)),
          integration: sum(m.map((x) => x.tests.integration)),
          e2e: sum(m.map((x) => x.tests.e2e)),
        },
      }
    }
    return { before: fold('before'), after: fold('after') }
  })

  /** Run counts per pipeline stage, used by the board and the stage rail. */
  const byStage = computed(() => {
    const out: Record<string, Run[]> = {}
    for (const key of Object.keys(stageMeta)) out[key] = []
    for (const run of runs.value) (out[run.state] ??= []).push(run)
    return out
  })

  return { data, runs, totals, byStage, pending, error, refresh }
}

export const totalTests = (m: RunMetrics) => m.tests.unit + m.tests.integration + m.tests.e2e

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
