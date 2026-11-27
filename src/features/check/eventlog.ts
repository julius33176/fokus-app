// Protokolliert Lebenszyklus-Ereignisse der Seite (Laden, Vordergrund, Hintergrund, URL).
// Zweck: herausfinden, ob iOS beim Öffnen per webapp:// / x-success die übergebene Adresse lädt
// oder die Web-App nur in den Vordergrund holt. Vorübergehend (iOS-Check, Phase 0/1).

export interface PageEvent {
  t: number
  type: string
  href: string
  extra?: string
}

const KEY = 'fokus-check-events'
const MAX = 60

function shortHref() {
  return window.location.pathname + window.location.search + window.location.hash
}

export function readEvents(): PageEvent[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as PageEvent[]
  } catch {
    return []
  }
}

export function clearEvents() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignorieren */
  }
}

function push(type: string, extra?: string) {
  const events = readEvents()
  events.unshift({ t: Date.now(), type, href: shortHref(), extra })
  try {
    localStorage.setItem(KEY, JSON.stringify(events.slice(0, MAX)))
  } catch {
    /* ignorieren */
  }
  window.dispatchEvent(new Event('fokus-check-events'))
}

export function startEventLog(): () => void {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  push('geladen', `${nav?.type ?? '?'} · ${standalone ? 'Web-App' : 'Safari'}`)

  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) push('aus Zwischenspeicher')
  }
  const onVisibility = () => push(document.visibilityState === 'visible' ? 'Vordergrund' : 'Hintergrund')
  const onHash = () => push('hash geändert')
  const onPop = () => push('popstate')
  window.addEventListener('pageshow', onPageShow)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('hashchange', onHash)
  window.addEventListener('popstate', onPop)
  return () => {
    window.removeEventListener('pageshow', onPageShow)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('hashchange', onHash)
    window.removeEventListener('popstate', onPop)
  }
}
