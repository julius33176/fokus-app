import { useEffect, useState } from 'react'
import { routeUrl } from '../../router/router.ts'
import { DESIGNS, MODES, type DesignId, type Mode, type Screen } from './demo.ts'
import { Aurora } from './designs/Aurora.tsx'
import { Instrument } from './designs/Instrument.tsx'
import { Ruhe } from './designs/Ruhe.tsx'
import { useDemoTimer, type DemoTimer } from './useDemoTimer.ts'
import './preview.css'

export interface DesignProps {
  screen: Screen
  mode: Mode
  timer: DemoTimer
  onStart: () => void
  onEnd: () => void
}

const TOTAL_MS = 25 * 60 * 1000
const DEMO_ELAPSED_MS = 6 * 60 * 1000 + 18 * 1000
const STORE_KEY = 'fokus-preview'

interface PreviewState {
  design: DesignId
  screen: Screen
  mode: Mode
  fast: boolean
}

function loadState(): PreviewState {
  const fallback: PreviewState = { design: 'aurora', screen: 'start', mode: 'fokus', fast: false }
  try {
    return { ...fallback, ...(JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') as Partial<PreviewState>) }
  } catch {
    return fallback
  }
}

export function PreviewApp() {
  const [state, setState] = useState<PreviewState>(loadState)
  const [panelOpen, setPanelOpen] = useState(false)
  const timer = useDemoTimer(TOTAL_MS, state.fast ? 60 : 1, DEMO_ELAPSED_MS)

  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state))
    } catch {
      /* ignorieren */
    }
  }, [state])

  const set = (patch: Partial<PreviewState>) => setState((s) => ({ ...s, ...patch }))

  const props: DesignProps = {
    screen: state.screen,
    mode: state.mode,
    timer,
    onStart: () => {
      timer.restart(0)
      set({ screen: 'timer' })
    },
    onEnd: () => set({ screen: 'start' }),
  }

  const design = DESIGNS.find((d) => d.id === state.design) ?? DESIGNS[0]

  return (
    <div className="pv" data-mode={state.mode}>
      {state.design === 'aurora' && <Aurora {...props} />}
      {state.design === 'instrument' && <Instrument {...props} />}
      {state.design === 'ruhe' && <Ruhe {...props} />}

      <div className={`pv-panel ${panelOpen ? 'is-open' : ''}`}>
        {panelOpen ? (
          <div className="pv-panel-body" role="dialog" aria-label="Vorschau-Einstellungen">
            <div className="pv-panel-head">
              <span>Vorschau · Phase 1</span>
              <button className="pv-close" onClick={() => setPanelOpen(false)}>
                Fertig
              </button>
            </div>
            <Segmented
              label="Design"
              value={state.design}
              options={DESIGNS.map((d) => ({ id: d.id, name: d.name }))}
              onChange={(design) => set({ design })}
            />
            <p className="pv-idea">{design.idea}</p>
            <Segmented
              label="Bildschirm"
              value={state.screen}
              options={[
                { id: 'start', name: 'Start' },
                { id: 'timer', name: 'Timer' },
              ]}
              onChange={(screen) => set({ screen })}
            />
            <Segmented
              label="Modus"
              value={state.mode}
              options={MODES.map((m) => ({ id: m.id, name: m.name }))}
              onChange={(mode) => set({ mode })}
            />
            <label className="pv-switch">
              <span>Zeitraffer (60×)</span>
              <input
                type="checkbox"
                checked={state.fast}
                onChange={(e) => set({ fast: e.target.checked })}
              />
            </label>
            <a className="pv-link" href={routeUrl('check')}>
              iOS-Check öffnen
            </a>
          </div>
        ) : (
          <button className="pv-pill" onClick={() => setPanelOpen(true)}>
            <span className="pv-pill-dot" />
            {design.name} · {state.screen === 'start' ? 'Start' : 'Timer'} ·{' '}
            {MODES.find((m) => m.id === state.mode)?.name}
          </button>
        )}
      </div>
    </div>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; name: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="pv-seg-wrap">
      <span className="pv-seg-label">{label}</span>
      <div className="pv-seg" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            role="radio"
            aria-checked={o.id === value}
            className={o.id === value ? 'is-active' : ''}
            onClick={() => onChange(o.id)}
          >
            {o.name}
          </button>
        ))}
      </div>
    </div>
  )
}
