import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { navigate, type Route } from '../router/router.ts'
import { IconBook, IconSettings, IconStats, IconToday } from './icons.tsx'

export function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      <span className="sky-blob sky-blob-1" />
      <span className="sky-blob sky-blob-2" />
      <span className="sky-blob sky-blob-3" />
    </div>
  )
}

const TABS: { route: Route; label: string; Icon: typeof IconToday }[] = [
  { route: '', label: 'Heute', Icon: IconToday },
  { route: 'stats', label: 'Statistik', Icon: IconStats },
  { route: 'subjects', label: 'Fächer', Icon: IconBook },
  { route: 'settings', label: 'Mehr', Icon: IconSettings },
]

export function TabBar({ route }: { route: Route }) {
  return (
    <nav className="tabbar" aria-label="Navigation">
      {TABS.map(({ route: r, label, Icon }) => (
        <button key={r || 'home'} aria-current={route === r ? 'page' : undefined} onClick={() => navigate(r)}>
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}

/** Bottom-Sheet mit Abdunklung. Schließen über Abdunklung oder Escape. */
export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <Overlay>
      <div className="sheet-scrim" onClick={onClose} />
      <div ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        <div className="sheet-grabber" />
        {children}
      </div>
    </Overlay>
  )
}

/**
 * Rendert Überlagerungen (Blätter, Hinweise) außerhalb des Bildschirms, aber innerhalb von .app,
 * damit die Palette greift und animierte Bildschirme `position: fixed` nicht verfälschen.
 */
export function Overlay({ children }: { children: ReactNode }) {
  const target = typeof document !== 'undefined' ? document.getElementById('overlays') : null
  return target ? createPortal(children, target) : <>{children}</>
}

export function Toast({ text }: { text: string }) {
  return (
    <Overlay>
      <div className="toast" role="status">
        {text}
      </div>
    </Overlay>
  )
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  label,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  format?: (v: number) => string
  label: string
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button aria-label={`${label} verringern`} onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min}>
        −
      </button>
      <output aria-live="polite">{format(value)}</output>
      <button aria-label={`${label} erhöhen`} onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max}>
        +
      </button>
    </div>
  )
}
