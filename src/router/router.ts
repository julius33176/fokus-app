import { useSyncExternalStore } from 'react'

// Mini-Router auf Basis der History-API. Pfade relativ zur Basis-URL (z. B. /fokus-app/stats/ → "stats").

export type Route = '' | 'stats' | 'subjects' | 'settings' | 'timer' | 'check'

const BASE = import.meta.env.BASE_URL // "/fokus-app/"
const KNOWN: Route[] = ['', 'stats', 'subjects', 'settings', 'timer', 'check']

export function currentRoute(pathname: string = window.location.pathname): Route {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '')
  const first = rest.replace(/\/+$/, '').split('/')[0] ?? ''
  return (KNOWN as string[]).includes(first) ? (first as Route) : ''
}

export function routeUrl(route: string, search = ''): string {
  const path = route ? `${BASE}${route}/` : BASE
  return search ? `${path}?${search}` : path
}

const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

if (typeof window !== 'undefined') window.addEventListener('popstate', notify)

export function navigate(route: Route, opts: { replace?: boolean } = {}) {
  const url = routeUrl(route)
  if (url === window.location.pathname) return
  if (opts.replace) window.history.replaceState(null, '', url)
  else window.history.pushState(null, '', url)
  notify()
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => currentRoute())
}
