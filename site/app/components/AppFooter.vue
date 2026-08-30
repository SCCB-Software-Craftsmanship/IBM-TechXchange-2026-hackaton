<script setup lang="ts">
import { navItems, project, repoUrl } from '~/data/project'
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t py-12" style="border-color: var(--line); background: var(--surface)">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 sm:px-8 md:flex-row md:items-start md:justify-between">
      <div class="max-w-sm">
        <div class="flex items-center gap-2.5">
          <BrandMark class="h-5 w-5" />
          <span class="font-mono text-[12.5px] font-semibold tracking-[0.16em] uppercase">
            {{ project.name }}
          </span>
        </div>
        <p class="mt-3 text-[13px] leading-relaxed" style="color: var(--ink-muted)">
          {{ project.tagline }}. Built for IBM TechXchange 2026 by SCCB — Software Craftsmanship Brasil.
        </p>
      </div>

      <nav class="flex flex-wrap gap-x-6 gap-y-2">
        <a
          v-for="item in navItems"
          :key="item.id"
          :href="`#${item.id}`"
          class="text-[13px] transition-colors"
          style="color: var(--ink-muted)"
        >
          {{ item.label }}
        </a>
      </nav>
    </div>

    <div
      class="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-2 border-t px-5 pt-6 sm:flex-row sm:items-center sm:justify-between sm:px-8"
      style="border-color: var(--line)"
    >
      <p class="font-mono text-[11px]" style="color: var(--ink-faint)">
        © {{ year }} SCCB · codename {{ project.codename }}
      </p>
      <a
        :href="repoUrl"
        target="_blank"
        rel="noopener"
        class="font-mono text-[11px]"
        style="color: var(--ink-faint)"
      >
        SCCB-Software-Craftsmanship/IBM-TechXchange-2026-hackaton
      </a>
    </div>
  </footer>
</template>
