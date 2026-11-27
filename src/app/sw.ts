import { useSyncExternalStore } from 'react'

// Registrierung des eigenen Service Workers (sw/sw-template.js) und Update-Hinweis.

let waiting: ServiceWorker | null = null
const listeners = new Set<() => void>()

function setWaiting(w: ServiceWorker) {
  waiting = w
  listeners.forEach((l) => l())
}

export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const base = import.meta.env.BASE_URL
  const hadController = !!navigator.serviceWorker.controller

  // Nur neu laden, wenn eine bestehende Version ersetzt wurde (nicht beim allerersten Installieren)
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })

  void navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting)
    reg.addEventListener('updatefound', () => {
      const next = reg.installing
      next?.addEventListener('statechange', () => {
        if (next.state === 'installed' && navigator.serviceWorker.controller) setWaiting(next)
      })
    })
    // iOS lässt Web-Apps lange im Speicher: bei jeder Rückkehr nach Updates schauen
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void reg.update().catch(() => {})
    })
  })
}

export function applyUpdate() {
  waiting?.postMessage('SKIP_WAITING')
}

export function useUpdateReady(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => waiting !== null,
  )
}
