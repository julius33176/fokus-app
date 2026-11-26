// Mini-Router: liest den Pfad relativ zur Basis-URL (z. B. /fokus-app/check/ → "check").
// Wird in Phase 2 um navigate()/Link mit History-API erweitert.

const BASE = import.meta.env.BASE_URL // "/fokus-app/"

export function currentRoute(pathname: string = window.location.pathname): string {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '')
  return rest.replace(/\/+$/, '').split('/')[0] ?? ''
}

export function routeUrl(route: string, search = ''): string {
  const path = route ? `${BASE}${route}/` : BASE
  return search ? `${path}?${search}` : path
}
