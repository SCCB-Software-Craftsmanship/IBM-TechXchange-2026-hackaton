import seed from '../data/runs.seed.json'
import { fetchRuns } from '../utils/cloudant'

/** The four states a TestabilityRun walks, in transition order. */
const STATE_ORDER = [
  'tests_not_yet_implemented',
  'tests_in_progress',
  'tests_implemented',
  'tests_verified',
] as const

const EMPTY_METRICS = {
  coverage: 0,
  testable_units: 0,
  open_barriers: 0,
  seams: 0,
  assertions: 0,
  suite_runtime_s: 0,
  tests: { unit: 0, integration: 0, e2e: 0 },
}

function prNumberFromLink(link: string): number | null {
  const match = /\/pull\/(\d+)/.exec(link || '')
  return match ? Number(match[1]) : null
}

/** Some writers save the JS string "null" instead of a real null/empty value. */
function cleanLink(link: unknown): string | null {
  if (typeof link !== 'string') return null
  const trimmed = link.trim()
  return trimmed && trimmed !== 'null' ? trimmed : null
}

/**
 * Flatten a raw Cloudant document into the shape the UI consumes.
 * Live documents may carry nothing in `meta`, so every display field
 * degrades to something renderable rather than undefined.
 */
function normalise(doc: any) {
  const meta = doc.meta ?? {}
  const metrics = meta.metrics ?? {}
  const prNumber = meta.pr_number ?? prNumberFromLink(doc.pr_link)

  return {
    id: doc._id,
    state: doc.state,
    stageIndex: Math.max(0, STATE_ORDER.indexOf(doc.state)),
    prLink: doc.pr_link ?? '',
    prNumber,
    prTitle: meta.pr_title ?? (prNumber ? `Pull request #${prNumber}` : 'Untitled run'),
    author: meta.author ?? null,
    branch: meta.branch ?? null,
    testabilityPrLink: cleanLink(doc.testability_pr_link),
    barriers: doc.barriers_resolved ?? [],
    summary: doc.summary ?? '',
    testPrs: doc.test_prs ?? {},
    createdAt: doc.created_at ?? null,
    updatedAt: doc.updated_at ?? null,
    timeline: meta.timeline ?? {},
    metrics: {
      before: { ...EMPTY_METRICS, ...(metrics.before ?? {}) },
      after: { ...EMPTY_METRICS, ...(metrics.after ?? {}) },
    },
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  let docs = seed.docs as any[]
  let source: 'cloudant' | 'sample' = 'sample'
  let error: string | null = null

  if (config.cloudantUrl && config.cloudantApiKey) {
    try {
      const live = await fetchRuns(config.cloudantUrl, config.cloudantApiKey, config.cloudantDb)
      // An empty database is a valid answer, but the presentation is more
      // useful with the sample than with nothing at all.
      if (live.length > 0) {
        docs = live
        source = 'cloudant'
      } else {
        error = 'Connected to Cloudant, but the database holds no runs yet — showing the sample.'
      }
    } catch (e: any) {
      error = `Cloudant read failed (${e?.message ?? 'unknown error'}) — showing the sample.`
    }
  }

  const runs = docs.map(normalise).sort((a, b) => {
    const at = new Date(a.updatedAt ?? 0).getTime()
    const bt = new Date(b.updatedAt ?? 0).getTime()
    return bt - at
  })

  return {
    source,
    error,
    database: config.cloudantDb,
    fetchedAt: new Date().toISOString(),
    states: STATE_ORDER,
    runs,
  }
})
