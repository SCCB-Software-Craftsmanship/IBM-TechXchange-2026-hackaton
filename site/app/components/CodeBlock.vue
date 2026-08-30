<script setup lang="ts">
const props = defineProps<{
  code: string
  id: string
  label?: string
}>()

const { copied, copy } = useCopy()
const isCopied = computed(() => copied.value === props.id)
</script>

<template>
  <div
    class="group relative overflow-hidden rounded-lg"
    style="background: var(--surface-sunken); border: 1px solid var(--line)"
  >
    <div
      v-if="label"
      class="flex items-center justify-between border-b px-4 py-2"
      style="border-color: var(--line)"
    >
      <span class="eyebrow">{{ label }}</span>
    </div>

    <button
      type="button"
      class="absolute top-2 right-2 z-10 rounded-md border px-2 py-1 font-mono text-[11px] transition-colors"
      :style="{
        borderColor: 'var(--line-strong)',
        background: 'var(--surface-raised)',
        color: isCopied ? 'var(--good)' : 'var(--ink-muted)',
      }"
      :aria-label="isCopied ? 'Copied to clipboard' : 'Copy code to clipboard'"
      @click="copy(props.code, props.id)"
    >
      {{ isCopied ? 'copied' : 'copy' }}
    </button>

    <pre
      class="overflow-x-auto px-4 py-3.5 pr-16 font-mono text-[12.5px] leading-relaxed"
      style="color: var(--ink)"
    ><code>{{ code }}</code></pre>
  </div>
</template>
