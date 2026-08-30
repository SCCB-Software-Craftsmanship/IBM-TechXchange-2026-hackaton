<script setup lang="ts">
import { orgUrl, repoUrl } from '~/data/project'
import { group, team } from '~/data/team'

const repoFacts = [
  { label: 'Organisation', value: 'SCCB-Software-Craftsmanship' },
  { label: 'Repository', value: 'IBM-TechXchange-2026-hackaton' },
  { label: 'Default branch', value: 'main' },
  { label: 'Licence', value: 'see repository' },
]
</script>

<template>
  <SectionShell
    id="github"
    eyebrow="GitHub"
    title="The repository and the people in it"
    :lede="group.blurb"
    sunken
  >
    <!-- Repo card -->
    <a
      :href="repoUrl"
      target="_blank"
      rel="noopener"
      class="reveal group flex flex-col gap-6 rounded-xl p-6 transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:p-8"
      style="background: var(--surface); border: 1px solid var(--line)"
    >
      <svg class="h-10 w-10 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path
          d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 016.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.8 5.65-5.48 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.83.58A12.01 12.01 0 0024 12.5C24 5.87 18.63.5 12 .5z"
        />
      </svg>

      <div class="min-w-0 flex-1">
        <p class="font-mono text-[13px] font-semibold">
          SCCB-Software-Craftsmanship / IBM-TechXchange-2026-hackaton
        </p>
        <p class="mt-2 text-[13.5px] leading-relaxed" style="color: var(--ink-muted)">
          Skills, orchestration prompts, Cloudant tracking and the OpenTofu configuration behind
          Seamwork — plus this presentation in <span class="font-mono">site/</span>.
        </p>
      </div>

      <span
        class="inline-flex shrink-0 items-center gap-2 rounded-md px-4 py-2 text-[13px] font-semibold text-white"
        style="background: var(--accent)"
      >
        Open on GitHub
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M7 17L17 7M9 7h8v8" />
        </svg>
      </span>
    </a>

    <dl
      class="reveal mt-4 grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4"
      style="border-color: var(--line); background: var(--line)"
    >
      <div v-for="fact in repoFacts" :key="fact.label" class="px-5 py-4" style="background: var(--surface)">
        <dt class="eyebrow">{{ fact.label }}</dt>
        <dd class="mt-1.5 font-mono text-[12.5px] break-all">{{ fact.value }}</dd>
      </div>
    </dl>

    <!-- Team -->
    <div class="reveal mt-14">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eyebrow">The group</p>
          <h3 class="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{{ group.name }}</h3>
        </div>
        <a
          :href="orgUrl"
          target="_blank"
          rel="noopener"
          class="font-mono text-[12.5px] transition-colors"
          style="color: var(--accent)"
        >
          github.com/SCCB-Software-Craftsmanship →
        </a>
      </div>

      <ul class="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="member in team" :key="member.login">
          <a
            :href="`https://github.com/${member.login}`"
            target="_blank"
            rel="noopener"
            class="flex h-full flex-col rounded-xl p-5 transition-transform hover:-translate-y-0.5"
            style="background: var(--surface); border: 1px solid var(--line)"
          >
            <div class="flex items-center gap-3">
              <img
                :src="`https://github.com/${member.login}.png?size=96`"
                :alt="`${member.name} on GitHub`"
                width="44"
                height="44"
                loading="lazy"
                class="h-11 w-11 rounded-full"
                style="background: var(--surface-sunken)"
              />
              <div class="min-w-0">
                <p class="truncate text-[14px] font-semibold">{{ member.name }}</p>
                <p class="font-mono text-[11.5px]" style="color: var(--accent)">@{{ member.login }}</p>
              </div>
            </div>

            <p class="mt-4 font-mono text-[10.5px] tracking-wide uppercase" style="color: var(--ink-faint)">
              {{ member.role }}
            </p>
            <p class="mt-1.5 text-[12.5px] leading-snug" style="color: var(--ink-muted)">
              {{ member.contributions }}
            </p>
          </a>
        </li>
      </ul>
    </div>
  </SectionShell>
</template>
