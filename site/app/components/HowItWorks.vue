<script setup lang="ts">
import { diagrams } from '~/data/diagrams'
import { kindMeta, skills } from '~/data/skills'

const activeDiagram = ref(diagrams[0]!.id)
const current = computed(() => diagrams.find((d) => d.id === activeDiagram.value)!)

const phases = ['All', ...Array.from(new Set(skills.map((s) => s.phase)))]
const activePhase = ref('All')
const visible = computed(() =>
  activePhase.value === 'All' ? skills : skills.filter((s) => s.phase === activePhase.value),
)

const toneStyle: Record<string, { bg: string; fg: string }> = {
  brand: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
  violet: { bg: 'color-mix(in srgb, #8a3ffc 12%, transparent)', fg: '#8a3ffc' },
  teal: { bg: 'color-mix(in srgb, #009d9a 14%, transparent)', fg: 'var(--good)' },
  neutral: { bg: 'var(--surface-sunken)', fg: 'var(--ink-muted)' },
}
</script>

<template>
  <SectionShell
    id="how-it-works"
    eyebrow="How it works"
    title="One approval, three phases, zero handoffs"
    lede="Onboarding runs once and teaches the agent what this repository already believes about testing. Everything after that is per pull request — and the two agents involved never talk to each other directly. Cloudant is the seam between them."
  >
    <div class="reveal">
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="d in diagrams"
          :key="d.id"
          type="button"
          class="rounded-md border px-3.5 py-1.5 text-[13px] font-medium transition-colors"
          :style="
            activeDiagram === d.id
              ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' }
              : { borderColor: 'var(--line-strong)', color: 'var(--ink-muted)' }
          "
          @click="activeDiagram = d.id"
        >
          {{ d.label }}
        </button>
      </div>

      <p class="mt-4 max-w-3xl text-[14.5px] leading-relaxed" style="color: var(--ink-muted)">
        {{ current.caption }}
      </p>

      <div class="mt-6">
        <MermaidView :key="current.id" :source="current.source" :diagram-id="current.id" />
      </div>
    </div>

    <div class="reveal mt-20">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="eyebrow">Skills, orchestrators and workflows</p>
          <h3 class="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            Every box in that diagram is a real file
          </h3>
        </div>

        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="phase in phases"
            :key="phase"
            type="button"
            class="rounded-full border px-3 py-1 font-mono text-[11px] tracking-wide transition-colors"
            :style="
              activePhase === phase
                ? { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'var(--accent-soft)' }
                : { borderColor: 'var(--line)', color: 'var(--ink-faint)' }
            "
            @click="activePhase = phase"
          >
            {{ phase }}
          </button>
        </div>
      </div>

      <div class="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article
          v-for="skill in visible"
          :key="skill.name"
          class="flex flex-col rounded-xl p-5 transition-transform hover:-translate-y-0.5"
          style="background: var(--surface-raised); border: 1px solid var(--line)"
        >
          <div class="flex items-start justify-between gap-3">
            <h4 class="font-mono text-[14px] font-semibold">{{ skill.name }}</h4>
            <span
              class="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] tracking-wide whitespace-nowrap"
              :style="{
                background: toneStyle[kindMeta[skill.kind].tone]!.bg,
                color: toneStyle[kindMeta[skill.kind].tone]!.fg,
              }"
            >
              {{ kindMeta[skill.kind].label }}
            </span>
          </div>

          <p class="mt-3 flex-1 text-[13.5px] leading-relaxed" style="color: var(--ink-muted)">
            {{ skill.summary }}
          </p>

          <dl class="mt-4 space-y-2 border-t pt-3.5" style="border-color: var(--line)">
            <div class="flex gap-3">
              <dt class="eyebrow w-14 shrink-0 pt-0.5">Runs</dt>
              <dd class="font-mono text-[11.5px] break-all" style="color: var(--ink)">{{ skill.invocation }}</dd>
            </div>
            <div class="flex gap-3">
              <dt class="eyebrow w-14 shrink-0 pt-0.5">Gives</dt>
              <dd class="text-[12px]" style="color: var(--ink-muted)">{{ skill.output }}</dd>
            </div>
            <div class="flex gap-3">
              <dt class="eyebrow w-14 shrink-0 pt-0.5">File</dt>
              <dd class="font-mono text-[11px] break-all" style="color: var(--ink-faint)">{{ skill.path }}</dd>
            </div>
          </dl>
        </article>
      </div>
    </div>
  </SectionShell>
</template>
