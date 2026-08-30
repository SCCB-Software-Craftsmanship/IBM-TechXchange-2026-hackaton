<script setup lang="ts">
const { runs } = useRuns()

/* The hero shows the most advanced recent run — a finished one tells the
   story better than whatever happens to be queued. */
const run = computed(() => {
  const list = runs.value
  if (!list.length) return null
  return [...list].sort((a, b) => b.stageIndex - a.stageIndex)[0]!
})

const rows = computed(() => {
  const r = run.value
  if (!r) return []
  const after = r.metrics.after
  const before = r.metrics.before
  return [
    { label: 'Pull request', value: r.prNumber ? `#${r.prNumber}` : '—', mono: true },
    { label: 'Author', value: r.author ?? 'unknown', mono: true },
    { label: 'Barriers removed', value: r.barriers.length ? r.barriers.join(', ') : 'none found', mono: true },
    { label: 'Tests written', value: String(totalTests(after) - totalTests(before)), mono: true },
    { label: 'Coverage', value: `${before.coverage}% → ${after.coverage}%`, mono: true },
    { label: 'Tracked in', value: 'Cloudant · testability-runs', mono: false },
  ]
})

const verified = computed(() => run.value?.state === 'tests_verified')
</script>

<template>
  <div
    class="w-full max-w-sm rounded-xl p-5 shadow-[0_16px_48px_-24px_rgba(15,98,254,0.35)]"
    style="background: var(--surface-raised); border: 1px solid var(--line)"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <BrandMark class="h-4 w-4" style="color: var(--ink-muted)" />
        <span class="text-[13px] font-semibold">Testability Run</span>
      </div>
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10.5px] tracking-wide"
        :style="{
          background: verified ? 'var(--good-soft)' : 'var(--accent-soft)',
          color: verified ? 'var(--good)' : 'var(--accent)',
        }"
      >
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
          <circle cx="12" cy="12" r="9.5" stroke-width="1.6" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12.4l2.6 2.6L16 9.6" />
        </svg>
        {{ verified ? 'Verified' : stageMeta[run?.state ?? '']?.short ?? 'Pending' }}
      </span>
    </div>

    <p class="mt-3.5 line-clamp-2 text-[12.5px] leading-snug" style="color: var(--ink-muted)">
      {{ run?.prTitle ?? 'Waiting for the first run…' }}
    </p>

    <dl class="mt-4 space-y-0">
      <div
        v-for="(row, i) in rows"
        :key="row.label"
        class="flex items-baseline justify-between gap-4 border-t py-2.5 first:border-t-0 first:pt-0"
        :style="{ borderColor: 'var(--line)' }"
      >
        <dt class="text-[12.5px] whitespace-nowrap" style="color: var(--ink-muted)">{{ row.label }}</dt>
        <dd
          class="truncate text-right text-[12.5px] font-medium"
          :class="row.mono ? 'font-mono' : ''"
          :style="{ color: i === rows.length - 1 ? 'var(--ink-muted)' : 'var(--ink)' }"
        >
          {{ row.value }}
        </dd>
      </div>
    </dl>

    <p class="mt-4 border-t pt-3 font-mono text-[10.5px]" style="border-color: var(--line); color: var(--ink-faint)">
      {{ run?.id?.slice(0, 8) ?? '········' }} · state/{{ run?.state ?? 'unknown' }}
    </p>
  </div>
</template>
