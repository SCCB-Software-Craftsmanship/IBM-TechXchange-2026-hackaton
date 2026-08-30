/**
 * Theme, scroll-spy and reveal-on-scroll — the three bits of browser state
 * the presentation needs. All of it is client-only and degrades to a sensible
 * static page when JavaScript has not run yet.
 */

const THEME_KEY = 'seamwork-theme'

export function useTheme() {
  const isDark = useState('theme-dark', () => false)

  const apply = (dark: boolean) => {
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', dark)
      try {
        localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
      } catch {
        // Private browsing — the toggle still works for this session.
      }
    }
  }

  onMounted(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(THEME_KEY)
    } catch {
      stored = null
    }
    isDark.value = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
    apply(isDark.value)
  })

  const toggle = () => {
    isDark.value = !isDark.value
    apply(isDark.value)
  }

  return { isDark, toggle }
}

/** Highlights the nav entry whose section currently occupies the viewport. */
export function useScrollSpy(ids: string[]) {
  const active = useState('active-section', () => ids[0] ?? '')

  onMounted(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))

    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry nearest the top of the viewport among those visible.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) active.value = visible[0].target.id
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    )

    sections.forEach((s) => observer.observe(s))
    onBeforeUnmount(() => observer.disconnect())
  })

  return active
}

/** Adds `.is-visible` to every `.reveal` element as it scrolls into view. */
export function useReveal() {
  onMounted(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      // Nothing to animate — but late-rendered nodes still need unhiding.
      const show = () => document.querySelectorAll('.reveal').forEach((n) => n.classList.add('is-visible'))
      show()
      const mo = new MutationObserver(show)
      mo.observe(document.body, { childList: true, subtree: true })
      onBeforeUnmount(() => mo.disconnect())
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )

    // Sections whose content arrives with the API response mount after this
    // composable runs, so new `.reveal` nodes are picked up as they appear.
    const register = () => {
      document.querySelectorAll('.reveal:not(.is-visible)').forEach((n) => io.observe(n))
    }
    register()

    const mo = new MutationObserver(register)
    mo.observe(document.body, { childList: true, subtree: true })

    onBeforeUnmount(() => {
      io.disconnect()
      mo.disconnect()
    })
  })
}

/** Copy-to-clipboard with a short-lived confirmation flag. */
export function useCopy() {
  const copied = ref<string | null>(null)
  let timer: ReturnType<typeof setTimeout> | null = null

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      copied.value = id
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => (copied.value = null), 1800)
    } catch {
      // Clipboard denied — the code is still selectable by hand.
    }
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })

  return { copied, copy }
}
