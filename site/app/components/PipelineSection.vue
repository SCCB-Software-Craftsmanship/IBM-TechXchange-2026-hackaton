<script setup lang="ts">
import { testabilityPrepSteps } from '~/data/testabilityProcess'

const { data, runs, refresh } = useRuns()

/* Not `pending` from useFetch — that is true while the server renders and
   false by the time the client hydrates, which trips a hydration mismatch.
   This flag only ever flips in response to a click. */
const refreshing = ref(false)
const reload = async () => {
  refreshing.value = true
  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

const stages = Object.keys(stageMeta)
const query = ref('')
const selectedId = ref<string | null>(null)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return runs.value
  return runs.value.filter((r) =>
    [String(r.prNumber ?? ''), r.prTitle, r.author ?? '', r.branch ?? '', ...r.barriers]
      .join(' ')
      .toLowerCase()
      .includes(q),
  )
})

const columns = computed(() =>
  stages.map((state) => ({
    state,
    ...stageMeta[state]!,
    runs: filtered.value.filter((r) => r.state === state),
  })),
)

const selected = computed(() => {
  const list = filtered.value
  return list.find((r) => r.id === selectedId.value) ?? list[0] ?? null
})

/* Elapsed time between the stages a run has actually reached.
   Live documents rarely carry meta.timeline, so a reached stage without a
   recorded timestamp falls back to created_at (first stage) or updated_at
   (the run's current stage) rather than the misleading "not reached". */
const legs = computed(() => {
  const run = selected.value
  if (!run) return []
  return stages.map((state, i) => {
    const done = run.stageIndex >= i
    const current = run.stageIndex === i
    let at = run.timeline[state] ?? null
    let approximate = false
    if (!at && done) {
      at = current ? run.updatedAt : i === 0 ? run.createdAt : null
      approximate = at !== null
    }
    const prev = i > 0 ? (run.timeline[stages[i - 1]!] ?? null) : null
    let elapsed: string | null = null
    if (at && prev && !approximate) {
      const mins = Math.round((new Date(at).getTime() - new Date(prev).getTime()) / 60000)
      elapsed = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
    }
    return {
      state,
      label: stageMeta[state]!.label,
      blurb: stageMeta[state]!.blurb,
      at,
      approximate,
      elapsed,
      done,
      current,
    }
  })
})

const layerOrder = ['unit', 'integration', 'e2e']
const testPrEntries = computed(() =>
  layerOrder
    .filter((l) => selected.value?.testPrs?.[l])
    .map((l) => ({ layer: l, url: selected.value!.testPrs[l]! })),
)

/* What Bob's testability-prep run actually proves for the selected run —
   grounded in real fields, never claiming more than the document supports. */
const processSteps = computed(() => {
  const run = selected.value
  if (!run) return []
  return testabilityPrepSteps.map((step) => ({ ...step, ...step.evidence(run) }))
})

/* Real commit history for the PR that led into this run — fetched live
   from GitHub, separately from whatever Cloudant does or doesn't record. */
const activity = ref<{ commits: any[]; error: string | null; loading: boolean }>({
  commits: [],
  error: null,
  loading: false,
})

watch(
  () => selected.value?.prLink,
  async (prLink) => {
    if (!prLink) {
      activity.value = { commits: [], error: null, loading: false }
      return
    }
    activity.value = { commits: [], error: null, loading: true }
    try {
      const res = await $fetch<{ commits: any[]; error: string | null }>('/api/pr-activity', {
        query: { url: prLink },
      })
      activity.value = { commits: res.commits, error: res.error, loading: false }
    } catch {
      activity.value = { commits: [], error: 'Failed to load commit history.', loading: false }
    }
  },
  { immediate: true },
)
</script>

<template>
  <SectionShell
    id="pipeline"
    eyebrow="Pipeline"
    title="Where every pull request actually is"
    lede="Each approved PR becomes one TestabilityRun document. The state on that document is the single answer to “has this been tested yet?” — and it only ever moves forward."
    sunken
  >
    <!-- Source + controls -->
    <div class="reveal mb-7 flex flex-wrap items-center gap-3">
      <span
        class="inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px]"
        :style="
          data?.source === 'cloudant'
            ? { background: 'var(--good-soft)', color: 'var(--good)' }
            : { background: 'var(--warn-soft)', color: 'var(--warn)' }
        "
      >
        <span
          class="inline-block h-1.5 w-1.5 rounded-full"
          :style="{ background: 'currentColor' }"
        />
        {{ data?.source === 'cloudant' ? `live · ${data.database}` : 'sample dataset' }}
      </span>

      <div class="relative min-w-[15rem] flex-1 sm:max-w-xs">
        <svg
          class="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2"
          style="color: var(--ink-faint)"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="7" />
          <path stroke-linecap="round" d="M20 20l-3.5-3.5" />
        </svg>
        <input
          v-model="query"
          type="search"
          placeholder="Filter by PR number, author, branch or barrier"
          class="w-full rounded-md border py-1.5 pr-3 pl-9 text-[13px] outline-none"
          style="border-color: var(--line-strong); background: var(--surface); color: var(--ink)"
        />
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] transition-colors"
        style="border-color: var(--line-strong); color: var(--ink-muted)"
        :disabled="refreshing"
        @click="reload()"
      >
        <svg
          class="h-3.5 w-3.5"
          :class="refreshing ? 'animate-spin' : ''"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M20 11a8 8 0 10-2.3 6.3M20 5v6h-6" />
        </svg>
        Refresh
      </button>
    </div>

    <p
      v-if="data?.error"
      class="reveal mb-6 rounded-md px-4 py-2.5 text-[13px]"
      style="background: var(--warn-soft); color: var(--warn)"
    >
      {{ data.error }}
    </p>

    <!-- Board -->
    <div class="reveal grid gap-4 lg:grid-cols-4">
      <div
        v-for="(col, i) in columns"
        :key="col.state"
        class="flex flex-col rounded-xl p-3.5"
        style="background: var(--surface); border: 1px solid var(--line)"
      >
        <div class="flex items-center justify-between gap-2 px-1 pb-3">
          <div class="flex items-center gap-2">
            <span
              class="flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-semibold"
              :style="{
                background: i === 3 ? 'var(--good-soft)' : 'var(--accent-soft)',
                color: i === 3 ? 'var(--good)' : 'var(--accent)',
              }"
            >
              {{ i + 1 }}
            </span>
            <h3 class="text-[13px] font-semibold">{{ col.short }}</h3>
          </div>
          <span class="font-mono text-[11px]" style="color: var(--ink-faint)">{{ col.runs.length }}</span>
        </div>

        <p class="mb-3 px-1 text-[11.5px] leading-snug" style="color: var(--ink-faint)">
          {{ col.blurb }}
        </p>

        <div class="flex flex-1 flex-col gap-2">
          <button
            v-for="run in col.runs"
            :key="run.id"
            type="button"
            class="rounded-lg border p-3 text-left transition-all"
            :style="{
              borderColor: selected?.id === run.id ? 'var(--accent)' : 'var(--line)',
              background: selected?.id === run.id ? 'var(--accent-soft)' : 'var(--surface-raised)',
              boxShadow: selected?.id === run.id ? '0 0 0 1px var(--accent)' : 'none',
            }"
            @click="selectedId = run.id"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-mono text-[11.5px] font-semibold" style="color: var(--accent)">
                #{{ run.prNumber ?? '—' }}
              </span>
              <span class="font-mono text-[10.5px]" style="color: var(--ink-faint)">
                {{ run.author ?? '' }}
              </span>
            </div>
            <p class="mt-1.5 line-clamp-2 text-[12.5px] leading-snug">{{ run.prTitle }}</p>
            <div v-if="run.barriers.length" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="b in run.barriers"
                :key="b"
                class="rounded px-1.5 py-0.5 font-mono text-[10px]"
                style="background: var(--surface-sunken); color: var(--ink-muted)"
              >
                {{ b }}
              </span>
            </div>
          </button>

          <p
            v-if="!col.runs.length"
            class="rounded-lg border border-dashed px-3 py-5 text-center text-[11.5px]"
            style="border-color: var(--line); color: var(--ink-faint)"
          >
            empty
          </p>
        </div>
      </div>
    </div>

    <!-- Detail -->
    <div
      v-if="selected"
      class="reveal mt-6 grid gap-8 rounded-xl p-6 lg:grid-cols-[minmax(0,1fr)_20rem] sm:p-8"
      style="background: var(--surface); border: 1px solid var(--line)"
    >
      <div>
        <p class="eyebrow">Selected run</p>
        <h3 class="mt-2 text-lg leading-snug font-semibold sm:text-xl">{{ selected.prTitle }}</h3>

        <div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px]" style="color: var(--ink-faint)">
          <span>{{ selected.id }}</span>
          <span v-if="selected.branch">branch/{{ selected.branch }}</span>
        </div>

        <p class="mt-5 max-w-2xl text-[14px] leading-relaxed" style="color: var(--ink-muted)">
          {{ selected.summary }}
        </p>

        <!-- Stage rail -->
        <ol class="mt-8 space-y-0">
          <li v-for="(leg, i) in legs" :key="leg.state" class="relative flex gap-4 pb-6 last:pb-0">
            <div class="flex flex-col items-center">
              <span
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                :style="{
                  borderColor: leg.done ? 'var(--accent)' : 'var(--line-strong)',
                  background: leg.done ? 'var(--accent)' : 'var(--surface)',
                }"
              >
                <svg
                  v-if="leg.done && !leg.current"
                  class="h-2.5 w-2.5 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span v-else-if="leg.current" class="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <span
                v-if="i < legs.length - 1"
                class="mt-1 w-0.5 flex-1"
                :style="{ background: legs[i + 1]!.done ? 'var(--accent)' : 'var(--line)' }"
              />
            </div>

            <div class="min-w-0 flex-1 pb-1">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  class="font-mono text-[12.5px] font-medium"
                  :style="{ color: leg.done ? 'var(--ink)' : 'var(--ink-faint)' }"
                >
                  {{ leg.state }}
                </span>
                <span
                  v-if="leg.current"
                  class="rounded-full px-2 py-0.5 font-mono text-[10px]"
                  style="background: var(--accent-soft); color: var(--accent)"
                >
                  current
                </span>
                <span v-if="leg.elapsed" class="font-mono text-[10.5px]" style="color: var(--ink-faint)">
                  +{{ leg.elapsed }}
                </span>
              </div>
              <p class="mt-1 text-[12.5px] leading-snug" style="color: var(--ink-muted)">{{ leg.blurb }}</p>
              <p class="mt-1 font-mono text-[11px]" style="color: var(--ink-faint)">
                <template v-if="leg.at">{{ formatDate(leg.at) }}<span v-if="leg.approximate"> (approx.)</span></template>
                <template v-else>not reached</template>
              </p>
            </div>
          </li>
        </ol>
      </div>

      <aside class="space-y-5">
        <div>
          <p class="eyebrow">Links</p>
          <div class="mt-2.5 flex flex-col gap-2">
            <a
              v-if="selected.prLink"
              :href="selected.prLink"
              target="_blank"
              rel="noopener"
              class="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-[12.5px] transition-colors"
              style="border-color: var(--line); color: var(--ink)"
            >
              <span>Feature PR</span>
              <span class="font-mono text-[11.5px]" style="color: var(--accent)">#{{ selected.prNumber }}</span>
            </a>
            <a
              v-if="selected.testabilityPrLink"
              :href="selected.testabilityPrLink"
              target="_blank"
              rel="noopener"
              class="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-[12.5px] transition-colors"
              style="border-color: var(--line); color: var(--ink)"
            >
              <span>Seam PR</span>
              <span class="font-mono text-[11.5px]" style="color: var(--accent)">open</span>
            </a>
            <p
              v-else
              class="rounded-md border border-dashed px-3 py-2 text-[12px]"
              style="border-color: var(--line); color: var(--ink-faint)"
            >
              No seam PR — no barrier was found.
            </p>
          </div>
        </div>

        <div>
          <p class="eyebrow">Test PRs by layer</p>
          <div class="mt-2.5 flex flex-col gap-2">
            <a
              v-for="entry in testPrEntries"
              :key="entry.layer"
              :href="entry.url"
              target="_blank"
              rel="noopener"
              class="flex items-center justify-between gap-2 rounded-md border px-3 py-2 font-mono text-[12px]"
              style="border-color: var(--line); color: var(--ink)"
            >
              <span>{{ entry.layer }}</span>
              <span style="color: var(--accent)">open →</span>
            </a>
            <p
              v-if="!testPrEntries.length"
              class="rounded-md border border-dashed px-3 py-2 text-[12px]"
              style="border-color: var(--line); color: var(--ink-faint)"
            >
              Not written yet.
            </p>
          </div>
        </div>

        <div>
          <p class="eyebrow">Barriers removed</p>
          <div class="mt-2.5 flex flex-wrap gap-1.5">
            <span
              v-for="b in selected.barriers"
              :key="b"
              class="rounded-md px-2 py-1 font-mono text-[11.5px]"
              style="background: var(--accent-soft); color: var(--accent)"
            >
              {{ b }}
            </span>
            <span v-if="!selected.barriers.length" class="text-[12px]" style="color: var(--ink-faint)">
              none
            </span>
          </div>
        </div>

        <div>
          <p class="eyebrow">Last updated</p>
          <p class="mt-2 font-mono text-[12px]" style="color: var(--ink-muted)">
            {{ formatDate(selected.updatedAt) }}
          </p>
        </div>
      </aside>

      <!-- What led into this PR — real commit history from GitHub -->
      <div class="lg:col-span-2">
        <p class="eyebrow">What led into this PR</p>
        <p class="mt-2 max-w-2xl text-[13px] leading-relaxed" style="color: var(--ink-faint)">
          Live commit history from GitHub for {{ selected.prLink }} — not stored in Cloudant, fetched fresh.
        </p>

        <p v-if="activity.loading" class="mt-4 text-[12.5px]" style="color: var(--ink-faint)">Loading commits…</p>
        <p
          v-else-if="activity.error"
          class="mt-4 rounded-md px-3 py-2 text-[12.5px]"
          style="background: var(--warn-soft); color: var(--warn)"
        >
          {{ activity.error }}
        </p>
        <p v-else-if="!activity.commits.length" class="mt-4 text-[12.5px]" style="color: var(--ink-faint)">
          No commits found on this PR.
        </p>
        <ol v-else class="mt-4 space-y-3">
          <li
            v-for="c in activity.commits"
            :key="c.sha"
            class="rounded-lg border p-3.5"
            style="border-color: var(--line); background: var(--surface-raised)"
          >
            <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <a
                :href="c.url"
                target="_blank"
                rel="noopener"
                class="font-mono text-[11.5px] font-medium"
                style="color: var(--accent)"
              >
                {{ c.sha }}
              </a>
              <span class="font-mono text-[11px]" style="color: var(--ink-faint)">
                {{ c.author }} · {{ formatDate(c.date) }}
              </span>
            </div>
            <p class="mt-1.5 text-[12.5px] leading-snug" style="color: var(--ink)">{{ c.headline }}</p>
            <pre
              v-if="c.body"
              class="mt-1.5 overflow-x-auto font-mono text-[11px] leading-relaxed whitespace-pre-wrap"
              style="color: var(--ink-faint)"
            >{{ c.body }}</pre>
          </li>
        </ol>
      </div>

      <!-- Bob's testability-prep procedure — grounded in SKILLS/testability-prep/SKILL.md -->
      <div class="lg:col-span-2">
        <p class="eyebrow">Bob's process for this run</p>
        <p class="mt-2 max-w-2xl text-[13px] leading-relaxed" style="color: var(--ink-faint)">
          The 12-step procedure <code class="font-mono">testability-prep</code> runs on every approved PR. Confirmed
          steps are backed by a field on this document; implied steps have no per-run trace in Cloudant but must
          have run for later steps to have produced their output.
        </p>

        <ol class="mt-4 space-y-0">
          <li
            v-for="step in processSteps"
            :key="step.id"
            class="flex gap-4 border-t py-3 first:border-t-0 first:pt-0"
            :style="{ borderColor: 'var(--line)' }"
          >
            <span
              class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-semibold"
              :style="{
                background:
                  step.tier === 'confirmed' ? 'var(--good-soft)' : step.tier === 'skipped' ? 'var(--surface-sunken)' : 'var(--accent-soft)',
                color: step.tier === 'confirmed' ? 'var(--good)' : step.tier === 'skipped' ? 'var(--ink-faint)' : 'var(--accent)',
              }"
            >
              {{ step.id }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span class="text-[12.5px] font-medium" style="color: var(--ink)">{{ step.title }}</span>
                <span
                  class="rounded-full px-2 py-0.5 font-mono text-[10px]"
                  :style="{
                    background:
                      step.tier === 'confirmed' ? 'var(--good-soft)' : step.tier === 'skipped' ? 'var(--surface-sunken)' : 'var(--accent-soft)',
                    color: step.tier === 'confirmed' ? 'var(--good)' : step.tier === 'skipped' ? 'var(--ink-faint)' : 'var(--accent)',
                  }"
                >
                  {{ step.tier }}
                </span>
              </div>
              <p class="mt-1 text-[12px] leading-snug" style="color: var(--ink-muted)">{{ step.note }}</p>
              <pre
                class="mt-1.5 overflow-x-auto rounded-md px-2.5 py-2 font-mono text-[10.5px] leading-relaxed"
                style="background: var(--surface-sunken); color: var(--ink-faint)"
              >{{ step.commands.join('\n') }}</pre>
            </div>
          </li>
        </ol>
      </div>
    </div>

    <p v-else class="reveal mt-6 text-center text-sm" style="color: var(--ink-faint)">
      No run matches “{{ query }}”.
    </p>
  </SectionShell>
</template>
