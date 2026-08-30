<script setup lang="ts">
import { prerequisites, setupTracks } from '~/data/setup'

const activeTrack = ref(setupTracks[0]!.id)
const track = computed(() => setupTracks.find((t) => t.id === activeTrack.value)!)
const openStep = ref<string | null>(setupTracks[0]!.steps[0]!.id)

watch(activeTrack, () => {
  openStep.value = track.value.steps[0]!.id
})

const toggle = (id: string) => {
  openStep.value = openStep.value === id ? null : id
}
</script>

<template>
  <SectionShell
    id="setup"
    eyebrow="Setup"
    title="Get it working"
    lede="The repository README is a stub, so this is the working setup — derived from the orchestrator prerequisites, the agent contract in scripts/HOWTOUSE.md and the OpenTofu configuration in iac/."
  >
    <!-- Prerequisites -->
    <div
      class="reveal mb-10 grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4"
      style="border-color: var(--line); background: var(--line)"
    >
      <div v-for="p in prerequisites" :key="p.name" class="px-5 py-4" style="background: var(--surface-raised)">
        <div class="flex items-baseline justify-between gap-2">
          <span class="text-[13.5px] font-semibold">{{ p.name }}</span>
          <span class="font-mono text-[11px]" style="color: var(--accent)">{{ p.version }}</span>
        </div>
        <p class="mt-1.5 text-[12px] leading-snug" style="color: var(--ink-muted)">{{ p.why }}</p>
      </div>
    </div>

    <!-- Track tabs -->
    <div class="reveal flex flex-wrap gap-2">
      <button
        v-for="t in setupTracks"
        :key="t.id"
        type="button"
        class="rounded-md border px-4 py-2 text-[13px] font-medium transition-colors"
        :style="
          activeTrack === t.id
            ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)', color: 'var(--accent)' }
            : { borderColor: 'var(--line-strong)', color: 'var(--ink-muted)' }
        "
        @click="activeTrack = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <p class="reveal mt-4 max-w-3xl text-[14.5px] leading-relaxed" style="color: var(--ink-muted)">
      {{ track.blurb }}
    </p>

    <!-- Steps -->
    <ol class="reveal mt-8 space-y-3">
      <li
        v-for="(step, i) in track.steps"
        :key="step.id"
        class="overflow-hidden rounded-xl"
        :style="{
          background: 'var(--surface-raised)',
          border: `1px solid ${openStep === step.id ? 'var(--accent)' : 'var(--line)'}`,
        }"
      >
        <button
          type="button"
          class="flex w-full items-center gap-4 px-5 py-4 text-left"
          :aria-expanded="openStep === step.id"
          @click="toggle(step.id)"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-semibold"
            :style="
              openStep === step.id
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--surface-sunken)', color: 'var(--ink-muted)' }
            "
          >
            {{ i + 1 }}
          </span>

          <span class="min-w-0 flex-1">
            <span class="block text-[14.5px] font-semibold">{{ step.title }}</span>
          </span>

          <svg
            class="h-4 w-4 shrink-0 transition-transform duration-200"
            :style="{
              color: 'var(--ink-faint)',
              transform: openStep === step.id ? 'rotate(180deg)' : 'none',
            }"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </button>

        <div v-show="openStep === step.id" class="px-5 pb-5 pl-16">
          <p class="max-w-2xl text-[13.5px] leading-relaxed" style="color: var(--ink-muted)">
            {{ step.body }}
          </p>

          <div v-if="step.code" class="mt-4">
            <CodeBlock :code="step.code" :id="`${track.id}-${step.id}`" />
          </div>

          <div v-if="step.prompt" class="mt-4">
            <CodeBlock
              :code="step.prompt"
              :id="`${track.id}-${step.id}-prompt`"
              variant="prompt"
            />
          </div>

          <p
            v-if="step.note"
            class="mt-3 border-l-2 pl-3 text-[12.5px] leading-snug"
            style="border-color: var(--accent); color: var(--ink-muted)"
          >
            {{ step.note }}
          </p>
        </div>
      </li>
    </ol>
  </SectionShell>
</template>
