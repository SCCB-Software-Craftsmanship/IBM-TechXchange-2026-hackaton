<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    code: string
    id: string
    label?: string
    /**
     * 'shell'  — a command you run in a terminal.
     * 'prompt' — natural language you paste into Bob. Styled apart from the
     *            terminal blocks so the two are never confused for each other.
     */
    variant?: 'shell' | 'prompt'
  }>(),
  { variant: 'shell' },
)

const { copied, copy } = useCopy()
const isCopied = computed(() => copied.value === props.id)
const isPrompt = computed(() => props.variant === 'prompt')
const heading = computed(() => props.label ?? (isPrompt.value ? 'Paste into Bob' : undefined))
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-lg"
    :style="{
      background: isPrompt ? 'var(--accent-soft)' : 'var(--surface-sunken)',
      border: `1px solid ${isPrompt ? 'var(--accent)' : 'var(--line)'}`,
    }"
  >
    <div
      v-if="heading"
      class="flex items-center gap-2 border-b px-4 py-2"
      :style="{ borderColor: isPrompt ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--line)' }"
    >
      <svg
        v-if="isPrompt"
        class="h-3.5 w-3.5 shrink-0"
        style="color: var(--accent)"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M21 11.5a8.5 8.5 0 01-8.5 8.5H7l-4 3v-5.4A8.5 8.5 0 0112.5 3a8.5 8.5 0 018.5 8.5z"
        />
      </svg>
      <span class="eyebrow" :style="isPrompt ? { color: 'var(--accent)' } : undefined">
        {{ heading }}
      </span>
    </div>

    <button
      type="button"
      class="absolute top-2 right-2 z-10 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors"
      :style="{
        borderColor: isPrompt ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--line-strong)',
        background: 'var(--surface-raised)',
        color: isCopied ? 'var(--good)' : 'var(--ink-muted)',
      }"
      :aria-label="isCopied ? 'Copied to clipboard' : 'Copy to clipboard'"
      @click="copy(props.code, props.id)"
    >
      {{ isCopied ? 'copied' : 'copy' }}
    </button>

    <!-- Prompts wrap as prose; shell commands keep their line breaks and scroll. -->
    <pre
      v-if="isPrompt"
      class="px-4 py-3.5 pr-16 text-[13.5px] leading-relaxed break-words whitespace-pre-wrap"
      style="color: var(--ink); font-family: inherit"
    >{{ code }}</pre>

    <pre
      v-else
      class="overflow-x-auto px-4 py-3.5 pr-16 font-mono text-[12.5px] leading-relaxed"
      style="color: var(--ink)"
    ><code>{{ code }}</code></pre>
  </div>
</template>
