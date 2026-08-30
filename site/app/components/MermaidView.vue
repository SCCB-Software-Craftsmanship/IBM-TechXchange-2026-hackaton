<script setup lang="ts">
const props = defineProps<{ source: string; diagramId: string }>()

const host = ref<HTMLElement | null>(null)
const svg = ref('')
const failed = ref(false)
const zoom = ref(1)
const { isDark } = useTheme()

/* Mermaid's `base` theme is the only one that honours themeVariables, so the
   palette is supplied explicitly and re-applied whenever the theme flips. */
function themeVariables(dark: boolean) {
  return {
    fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
    fontSize: '14px',
    background: 'transparent',
    primaryColor: '#edf5ff',
    primaryTextColor: '#161616',
    primaryBorderColor: '#0f62fe',
    secondaryColor: '#f4f4f4',
    tertiaryColor: '#ffffff',
    lineColor: dark ? '#7a7a85' : '#8d8d8d',
    textColor: dark ? '#e8e8ea' : '#161616',
    // Subgraph containers
    clusterBkg: dark ? 'rgba(255,255,255,0.03)' : '#fafafa',
    clusterBorder: dark ? '#3d3d45' : '#e0e0e0',
    titleColor: dark ? '#e8e8ea' : '#161616',
    edgeLabelBackground: dark ? '#161619' : '#ffffff',
    // State diagram specifics
    noteBkgColor: dark ? '#2c2410' : '#fcf4d6',
    noteTextColor: dark ? '#f1c21b' : '#5c4813',
    noteBorderColor: dark ? '#5c4813' : '#e6c34a',
    labelColor: '#161616',
  }
}

let mermaidApi: any = null

async function render() {
  if (!import.meta.client) return
  try {
    if (!mermaidApi) {
      mermaidApi = (await import('mermaid')).default
    }
    mermaidApi.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      themeVariables: themeVariables(isDark.value),
      flowchart: { htmlLabels: true, curve: 'basis', padding: 14, nodeSpacing: 42, rankSpacing: 52 },
      state: { titleTopMargin: 12 },
    })

    // A fresh id per render keeps mermaid from reusing a stale definition.
    const id = `mmd-${props.diagramId}-${isDark.value ? 'd' : 'l'}-${Date.now()}`
    const { svg: out } = await mermaidApi.render(id, props.source)
    svg.value = out
    failed.value = false
  } catch (e) {
    failed.value = true
    svg.value = ''
    console.error('[mermaid] render failed', e)
  }
}

onMounted(render)
watch(() => [props.source, isDark.value], render)

const step = (delta: number) => {
  zoom.value = Math.min(2, Math.max(0.5, Number((zoom.value + delta).toFixed(2))))
}
</script>

<template>
  <div class="relative">
    <div
      class="absolute top-3 right-3 z-10 flex items-center gap-px overflow-hidden rounded-md border"
      style="border-color: var(--line-strong); background: var(--surface-raised)"
    >
      <button
        type="button"
        class="px-2.5 py-1 font-mono text-[13px]"
        style="color: var(--ink-muted)"
        aria-label="Zoom out"
        @click="step(-0.15)"
      >
        −
      </button>
      <button
        type="button"
        class="border-x px-2 py-1 font-mono text-[11px]"
        style="border-color: var(--line); color: var(--ink-muted)"
        aria-label="Reset zoom"
        @click="zoom = 1"
      >
        {{ Math.round(zoom * 100) }}%
      </button>
      <button
        type="button"
        class="px-2.5 py-1 font-mono text-[13px]"
        style="color: var(--ink-muted)"
        aria-label="Zoom in"
        @click="step(0.15)"
      >
        +
      </button>
    </div>

    <div
      ref="host"
      class="mermaid-host overflow-auto rounded-xl p-5 sm:p-8"
      style="background: var(--surface-raised); border: 1px solid var(--line); max-height: 78vh"
    >
      <div
        v-if="svg"
        class="origin-top transition-transform duration-200"
        :style="{ transform: `scale(${zoom})` }"
        v-html="svg"
      />

      <p v-else-if="failed" class="py-16 text-center text-sm" style="color: var(--bad)">
        The diagram could not be rendered. Check the browser console for the Mermaid error.
      </p>

      <div v-else class="flex items-center justify-center gap-3 py-20" style="color: var(--ink-faint)">
        <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span class="font-mono text-xs">rendering diagram…</span>
      </div>
    </div>
  </div>
</template>
