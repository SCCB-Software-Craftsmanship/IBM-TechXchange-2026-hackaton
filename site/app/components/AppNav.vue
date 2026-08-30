<script setup lang="ts">
import { navItems, project } from '~/data/project'

const active = useScrollSpy(navItems.map((n) => n.id))
const { isDark, toggle } = useTheme()
const menuOpen = ref(false)
const scrolled = ref(false)

onMounted(() => {
  const onScroll = () => (scrolled.value = window.scrollY > 12)
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
})
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-all duration-300"
    :style="{
      background: scrolled ? 'color-mix(in srgb, var(--surface) 88%, transparent)' : 'transparent',
      borderBottom: `1px solid ${scrolled ? 'var(--line)' : 'transparent'}`,
      backdropFilter: scrolled ? 'saturate(180%) blur(12px)' : 'none',
    }"
  >
    <nav class="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-5 sm:px-8">
      <a href="#home" class="flex shrink-0 items-center gap-2.5" aria-label="Seamwork — back to top">
        <BrandMark class="h-6 w-6" />
        <span class="font-mono text-[13px] font-semibold tracking-[0.16em] uppercase">
          {{ project.name }}
        </span>
      </a>

      <ul class="ml-auto hidden items-center gap-1 md:flex">
        <li v-for="item in navItems" :key="item.id">
          <a
            :href="`#${item.id}`"
            class="relative rounded-md px-3 py-1.5 text-[13.5px] transition-colors"
            :style="{
              color: active === item.id ? 'var(--ink)' : 'var(--ink-muted)',
              fontWeight: active === item.id ? 600 : 400,
            }"
          >
            {{ item.label }}
            <span
              v-if="active === item.id"
              class="absolute inset-x-3 -bottom-0.5 h-px"
              style="background: var(--accent)"
            />
          </a>
        </li>
      </ul>

      <div class="ml-auto flex items-center gap-1 md:ml-0">
        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-md transition-colors"
          style="color: var(--ink-muted)"
          :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
          @click="toggle"
        >
          <svg v-if="isDark" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="12" r="4" />
            <path
              stroke-linecap="round"
              d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
            />
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z" />
          </svg>
        </button>

        <button
          type="button"
          class="flex h-9 w-9 items-center justify-center rounded-md md:hidden"
          style="color: var(--ink-muted)"
          :aria-expanded="menuOpen"
          aria-label="Toggle navigation menu"
          @click="menuOpen = !menuOpen"
        >
          <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <path v-if="!menuOpen" stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
            <path v-else stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </nav>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <ul
        v-if="menuOpen"
        class="border-t px-5 py-3 md:hidden"
        style="border-color: var(--line); background: var(--surface)"
      >
        <li v-for="item in navItems" :key="item.id">
          <a
            :href="`#${item.id}`"
            class="block rounded-md px-2 py-2.5 text-sm"
            :style="{ color: active === item.id ? 'var(--accent)' : 'var(--ink-muted)' }"
            @click="menuOpen = false"
          >
            {{ item.label }}
          </a>
        </li>
      </ul>
    </Transition>
  </header>
</template>
