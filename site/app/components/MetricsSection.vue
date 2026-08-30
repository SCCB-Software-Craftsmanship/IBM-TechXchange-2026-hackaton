<script setup lang="ts">
const { runs, totals } = useRuns()

const scope = ref<'all' | string>('all')

const pair = computed(() => {
  if (scope.value === 'all') return totals.value
  const run = runs.value.find((r) => r.id === scope.value)
  return run ? run.metrics : totals.value
})

const scopeLabel = computed(() => {
  if (scope.value === 'all') return 'every tracked run'
  const run = runs.value.find((r) => r.id === scope.value)
  return run ? `PR #${run.prNumber}` : 'every tracked run'
})

interface Row {
  key: string
  label: string
  before: number
  after: number
  suffix?: string
  /** true when a smaller number is the better outcome */
  lowerIsBetter?: boolean
  note: string
}

const rows = computed<Row[]>(() => {
  const b = pair.value.before
  const a = pair.value.after
  return [
    {
      key: 'coverage',
      label: 'Line coverage on changed code',
      before: b.coverage,
      after: a.coverage,
      suffix: '%',
      note: 'Weighted by testable units, so a docs-only run cannot drag the average down.',
    },
    {
      key: 'barriers',
      label: 'Open testability barriers',
      before: b.open_barriers,
      after: a.open_barriers,
      lowerIsBetter: true,
      note: 'Counted against the derived HEURISTICS.md checklist for this repository.',
    },
    {
      key: 'seams',
      label: 'Injectable seams',
      before: b.seams,
      after: a.seams,
      note: 'Every seam has to name the one test it unblocks, or it is not added.',
    },
    {
      key: 'unit',
      label: 'Unit tests',
      before: b.tests.unit,
      after: a.tests.unit,
      note: 'Pure functions and single-module logic, no I/O.',
    },
    {
      key: 'integration',
      label: 'Integration tests',
      before: b.tests.integration,
      after: a.tests.integration,
      note: 'Crossing a module boundary with a real or stubbed dependency.',
    },
    {
      key: 'e2e',
      label: 'End-to-end tests',
      before: b.tests.e2e,
      after: a.tests.e2e,
      note: 'Full request-response or CLI invocation.',
    },
    {
      key: 'assertions',
      label: 'Assertions',
      before: b.assertions,
      after: a.assertions,
      note: 'Test count alone can be gamed; assertion count is harder to fake.',
    },
  ]
})

interface Tile {
  label: string
  before: string
  after: string
  delta: number
  suffix: string
  lowerIsBetter?: boolean
  neutral?: boolean
}

const headline = computed<Tile[]>(() => {
  const b = pair.value.before
  const a = pair.value.after
  return [
    {
      label: 'Coverage',
      before: `${b.coverage}%`,
      after: `${a.coverage}%`,
      delta: a.coverage - b.coverage,
      suffix: 'pp',
    },
    {
      label: 'Tests',
      before: String(totalTests(b)),
      after: String(totalTests(a)),
      delta: totalTests(a) - totalTests(b),
      suffix: '',
    },
    {
      label: 'Open barriers',
      before: String(b.open_barriers),
      after: String(a.open_barriers),
      delta: a.open_barriers - b.open_barriers,
      suffix: '',
      lowerIsBetter: true,
    },
    {
      label: 'Suite runtime',
      before: `${b.suite_runtime_s.toFixed(2)}s`,
      after: `${a.suite_runtime_s.toFixed(2)}s`,
      delta: Number((a.suite_runtime_s - b.suite_runtime_s).toFixed(2)),
      suffix: 's',
      neutral: true,
    },
  ]
})

const scale = (row: Row) => Math.max(row.before, row.after, 1)

const pyramid = (side: 'before' | 'after') => {
  const t = pair.value[side].tests
  const max = Math.max(t.unit, t.integration, t.e2e, 1)
  return [
    { layer: 'e2e', n: t.e2e, w: (t.e2e / max) * 100 },
    { layer: 'integration', n: t.integration, w: (t.integration / max) * 100 },
    { layer: 'unit', n: t.unit, w: (t.unit / max) * 100 },
  ]
}

const deltaColor = (delta: number, lowerIsBetter = false, neutral = false) => {
  if (neutral || delta === 0) return 'var(--ink-faint)'
  const good = lowerIsBetter ? delta < 0 : delta > 0
  return good ? 'var(--good)' : 'var(--bad)'
}
</script>

<template>
  <SectionShell
    id="metrics"
    eyebrow="Metrics"
    title="Before the pipeline touched it, and after"
    :lede="`The left number is the changed code as it arrived from review. The right number is the same code once testability-prep removed its barriers and generate-tests wrote the suites. Showing ${scopeLabel}.`"
  >
    <!-- Scope selector -->
    <div class="reveal mb-8 flex flex-wrap gap-1.5">
      <button
        type="button"
        class="rounded-full border px-3.5 py-1.5 font-mono text-[11.5px] transition-colors"
        :style="
          scope === 'all'
            ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' }
            : { borderColor: 'var(--line-strong)', color: 'var(--ink-muted)' }
        "
        @click="scope = 'all'"
      >
        All runs
      </button>
      <button
        v-for="run in runs"
        :key="run.id"
        type="button"
        class="rounded-full border px-3.5 py-1.5 font-mono text-[11.5px] transition-colors"
        :style="
          scope === run.id
            ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' }
            : { borderColor: 'var(--line-strong)', color: 'var(--ink-muted)' }
        "
        @click="scope = run.id"
      >
        PR #{{ run.prNumber }}
      </button>
    </div>

    <!-- Headline tiles -->
    <div class="reveal grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="tile in headline"
        :key="tile.label"
        class="rounded-xl p-5"
        style="background: var(--surface-raised); border: 1px solid var(--line)"
      >
        <p class="eyebrow">{{ tile.label }}</p>
        <div class="mt-3 flex items-baseline gap-2">
          <span class="font-mono text-[15px] line-through" style="color: var(--ink-faint)">{{ tile.before }}</span>
          <svg class="h-3 w-3" style="color: var(--ink-faint)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          <span class="font-mono text-2xl font-semibold tracking-tight">{{ tile.after }}</span>
        </div>
        <p
          class="mt-2 font-mono text-[11.5px]"
          :style="{ color: deltaColor(tile.delta, tile.lowerIsBetter, tile.neutral) }"
        >
          {{ tile.delta > 0 ? '+' : '' }}{{ tile.delta }}{{ tile.suffix }}
          <span v-if="tile.neutral" style="color: var(--ink-faint)">— cost of the new suites</span>
        </p>
      </div>
    </div>

    <!-- Paired bars -->
    <div
      class="reveal mt-6 overflow-hidden rounded-xl"
      style="background: var(--surface-raised); border: 1px solid var(--line)"
    >
      <div
        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b px-5 py-3 sm:px-6"
        style="border-color: var(--line)"
      >
        <p class="eyebrow">Metric</p>
        <div class="flex items-center gap-5">
          <span class="eyebrow flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-sm" style="background: var(--line-strong)" />before
          </span>
          <span class="eyebrow flex items-center gap-1.5">
            <span class="h-2 w-2 rounded-sm" style="background: var(--accent)" />after
          </span>
        </div>
      </div>

      <div
        v-for="row in rows"
        :key="row.key"
        class="border-b px-5 py-4 last:border-b-0 sm:px-6"
        style="border-color: var(--line)"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p class="text-[13.5px] font-medium">{{ row.label }}</p>
          <p class="font-mono text-[12.5px]">
            <span style="color: var(--ink-faint)">{{ row.before }}{{ row.suffix ?? '' }}</span>
            <span style="color: var(--ink-faint)"> → </span>
            <span style="color: var(--ink)">{{ row.after }}{{ row.suffix ?? '' }}</span>
            <span
              class="ml-2"
              :style="{ color: deltaColor(row.after - row.before, row.lowerIsBetter) }"
            >
              {{ row.after - row.before > 0 ? '+' : '' }}{{ row.after - row.before }}
            </span>
          </p>
        </div>

        <div class="mt-2.5 space-y-1.5">
          <div class="h-1.5 overflow-hidden rounded-full" style="background: var(--surface-sunken)">
            <div
              class="h-full rounded-full transition-[width] duration-700 ease-out"
              :style="{ width: `${(row.before / scale(row)) * 100}%`, background: 'var(--line-strong)' }"
            />
          </div>
          <div class="h-1.5 overflow-hidden rounded-full" style="background: var(--surface-sunken)">
            <div
              class="h-full rounded-full transition-[width] duration-700 ease-out"
              :style="{
                width: `${(row.after / scale(row)) * 100}%`,
                background: row.lowerIsBetter && row.after > row.before ? 'var(--bad)' : 'var(--accent)',
              }"
            />
          </div>
        </div>

        <p class="mt-2 text-[12px] leading-snug" style="color: var(--ink-faint)">{{ row.note }}</p>
      </div>
    </div>

    <!-- Pyramid -->
    <div class="reveal mt-6 grid gap-4 sm:grid-cols-2">
      <div
        v-for="side in (['before', 'after'] as const)"
        :key="side"
        class="rounded-xl p-6"
        style="background: var(--surface-raised); border: 1px solid var(--line)"
      >
        <p class="eyebrow">Test pyramid — {{ side }}</p>
        <div class="mt-5 space-y-2.5">
          <div v-for="band in pyramid(side)" :key="band.layer" class="flex items-center gap-3">
            <span class="w-20 shrink-0 text-right font-mono text-[11.5px]" style="color: var(--ink-muted)">
              {{ band.layer }}
            </span>
            <div class="flex-1">
              <div
                class="flex h-7 items-center justify-end rounded px-2 transition-[width] duration-700 ease-out"
                :style="{
                  width: `${Math.max(band.w, band.n > 0 ? 12 : 3)}%`,
                  background: side === 'after' ? 'var(--accent)' : 'var(--line-strong)',
                  minWidth: '2rem',
                }"
              >
                <span class="font-mono text-[11.5px] font-semibold" :style="{ color: side === 'after' ? '#fff' : 'var(--ink-muted)' }">
                  {{ band.n }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <p class="mt-5 border-t pt-3 font-mono text-[11.5px]" style="border-color: var(--line); color: var(--ink-faint)">
          {{ totalTests(pair[side]) }} tests · {{ pair[side].assertions }} assertions
        </p>
      </div>
    </div>
  </SectionShell>
</template>
