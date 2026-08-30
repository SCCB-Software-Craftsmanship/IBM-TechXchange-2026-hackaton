<script setup lang="ts">
defineProps<{
  id: string
  eyebrow: string
  title: string
  lede?: string
  sunken?: boolean
}>()
</script>

<template>
  <section
    :id="id"
    class="scroll-mt-20 border-t py-20 sm:py-28"
    :style="{
      borderColor: 'var(--line)',
      background: sunken ? 'var(--surface-sunken)' : 'var(--surface)',
    }"
  >
    <div class="mx-auto w-full max-w-6xl px-5 sm:px-8">
      <header class="reveal max-w-3xl">
        <p class="eyebrow">{{ eyebrow }}</p>
        <h2 class="mt-3 text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {{ title }}
        </h2>
        <p v-if="lede" class="mt-4 text-base leading-relaxed sm:text-lg" style="color: var(--ink-muted)">
          {{ lede }}
        </p>
      </header>

      <div class="mt-12">
        <slot />
      </div>
    </div>
  </section>
</template>
