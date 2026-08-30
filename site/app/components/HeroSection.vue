<script setup lang="ts">
import { project, repoUrl } from '~/data/project'

const { totals, runs } = useRuns()

const stats = computed(() => {
  const before = totals.value.before
  const after = totals.value.after
  return [
    { value: `+${totalTests(after) - totalTests(before)}`, label: 'tests written by the pipeline' },
    { value: `${before.coverage}% → ${after.coverage}%`, label: 'coverage on changed code' },
    { value: String(before.open_barriers), label: 'barriers found and removed' },
    { value: String(runs.value.length), label: 'runs tracked in Cloudant' },
  ]
})
</script>

<template>
  <section id="home" class="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28">
    <!-- Faint grid, fading out toward the bottom of the hero -->
    <div
      class="pointer-events-none absolute inset-0 -z-10"
      style="
        background-image:
          linear-gradient(to right, var(--line) 1px, transparent 1px),
          linear-gradient(to bottom, var(--line) 1px, transparent 1px);
        background-size: 72px 72px;
        mask-image: radial-gradient(ellipse 90% 60% at 50% 0%, #000 20%, transparent 78%);
        opacity: 0.5;
      "
    />

    <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <div class="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div class="reveal is-visible max-w-2xl">
          <span
            class="inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide"
            style="border-color: var(--line-strong); color: var(--ink-muted)"
          >
            <span class="inline-block h-1.5 w-1.5 rounded-full" style="background: var(--accent)" />
            {{ project.kicker }}
          </span>

          <h1 class="mt-6 text-[2.6rem] leading-[1.05] font-bold tracking-tight sm:text-6xl">
            {{ project.headline.lead }}<br />
            <span class="font-serif italic" style="color: var(--accent)">
              {{ project.headline.accent }}
            </span>
          </h1>

          <p class="mt-6 max-w-xl text-base leading-relaxed sm:text-lg" style="color: var(--ink-muted)">
            {{ project.description }}
          </p>

          <div class="mt-9 flex flex-wrap items-center gap-3">
            <a
              :href="project.ctaPrimary.href"
              class="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-px"
              style="background: var(--accent)"
            >
              {{ project.ctaPrimary.label }}
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M20 12H4" />
              </svg>
            </a>
            <a
              :href="repoUrl"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-medium transition-colors"
              style="border-color: var(--line-strong); color: var(--ink)"
            >
              {{ project.ctaSecondary.label }}
            </a>
          </div>

          <p class="mt-6 font-mono text-[11.5px]" style="color: var(--ink-faint)">
            codename {{ project.codename }} · IBM TechXchange 2026 · SCCB
          </p>
        </div>

        <div class="reveal is-visible justify-self-start lg:justify-self-end">
          <RunPassport />
        </div>
      </div>

      <dl
        class="reveal mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-xl border lg:grid-cols-4"
        style="border-color: var(--line); background: var(--line)"
      >
        <div v-for="stat in stats" :key="stat.label" class="px-5 py-6" style="background: var(--surface)">
          <dt class="font-mono text-2xl font-semibold tracking-tight sm:text-[1.75rem]" style="color: var(--accent)">
            {{ stat.value }}
          </dt>
          <dd class="mt-1.5 text-[12.5px] leading-snug" style="color: var(--ink-muted)">
            {{ stat.label }}
          </dd>
        </div>
      </dl>
    </div>
  </section>
</template>
