import { useRef, useState } from 'react'
import type { DesignProps } from '../PreviewApp.tsx'
import { GATE_TODAY, MODE_COPY, PRESETS, SESSION, SUBJECTS, TODAY, formatClock, formatHours } from '../demo.ts'
import { useTimerFrame } from '../useDemoTimer.ts'
import { endTimeLabel } from './shared.ts'
import './instrument.css'

// Richtung 2 – Instrument: präzise wie ein Cockpit-Instrument. Haarlinien, Messwerte in
// Monospace, eine Skala mit 60 Strichen, die sich mit der Zeit füllt. Ruhig, technisch, exakt.

const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO']

export function Instrument(props: DesignProps) {
  return (
    <div className="in">
      <div className="in-bg" aria-hidden="true">
        <span className="in-horizon" />
      </div>
      {props.screen === 'start' ? (
        <InstrumentStart key="start" {...props} />
      ) : (
        <InstrumentTimer key="timer" {...props} />
      )}
    </div>
  )
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function InstrumentStart({ mode, onStart }: DesignProps) {
  const [subject, setSubject] = useState(SUBJECTS[0].id)
  const [preset, setPreset] = useState(PRESETS[0].id)
  const copy = MODE_COPY[mode]
  const maxDay = Math.max(...TODAY.week, 1)
  const weekPct = TODAY.weekMin / TODAY.weekGoalMin

  return (
    <main className="in-start pv-enter">
      <header className="in-status">
        <span className="in-mono">FR 27.11. · KW 48</span>
        <span className="in-live">
          <span className="in-live-dot" />
          {copy.greeting.toUpperCase()}
        </span>
      </header>

      <section className="in-primary" aria-label="Heute gelernt">
        <span className="in-label">Fokuszeit heute</span>
        <p className="in-readout">
          <span className="in-readout-num">
            {pad2(Math.floor(TODAY.focusMin / 60))}:{pad2(TODAY.focusMin % 60)}
          </span>
          <span className="in-readout-unit">H:MIN</span>
        </p>
        <p className="in-note">{copy.line}</p>
      </section>

      <section className="in-grid" aria-label="Kennzahlen">
        <div className="in-cell">
          <span className="in-label">Woche</span>
          <span className="in-value">
            {formatHours(TODAY.weekMin)}
            <small>/{formatHours(TODAY.weekGoalMin)} h</small>
          </span>
          <span className="in-gauge">
            <span style={{ transform: `scaleX(${weekPct})` }} />
          </span>
        </div>
        <div className="in-cell">
          <span className="in-label">Serie</span>
          <span className="in-value">
            {TODAY.streakDays}
            <small> Tage</small>
          </span>
          <span className="in-sub">Ziel ≥ 30 min/Tag</span>
        </div>
        <div className="in-cell in-cell-wide">
          <span className="in-label">Verlauf</span>
          <ol className="in-week">
            {TODAY.week.map((min, i) => (
              <li key={i} className={i === 4 ? 'is-today' : ''}>
                <span className="in-week-col">
                  <span style={{ transform: `scaleY(${min / maxDay})` }} />
                </span>
                <span className="in-week-day">{WEEKDAYS[i]}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="in-setup" aria-label="Session vorbereiten">
        <div className="in-seg-row">
          <span className="in-label">Fach</span>
          <div className="in-seg" role="radiogroup" aria-label="Fach">
            {SUBJECTS.map((s) => (
              <button key={s.id} role="radio" aria-checked={s.id === subject} onClick={() => setSubject(s.id)}>
                {s.name.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="in-seg-row">
          <span className="in-label">Takt</span>
          <div className="in-seg" role="radiogroup" aria-label="Takt">
            {PRESETS.map((p) => (
              <button key={p.id} role="radio" aria-checked={p.id === preset} onClick={() => setPreset(p.id)}>
                {p.name.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <button className="in-cta" onClick={onStart}>
          <span>Session starten</span>
          <span className="in-mono">25:00 ▸</span>
        </button>
      </section>

      <section className="in-limits" aria-label="Scroll-Limits heute">
        {GATE_TODAY.map((g) => (
          <div key={g.id} className="in-limit">
            <span className="in-limit-name">{g.name}</span>
            <span className="in-pips" aria-hidden="true">
              {Array.from({ length: g.limit }, (_, i) => (
                <span key={i} className={i < g.used ? 'is-used' : ''} />
              ))}
            </span>
            <span className="in-mono in-limit-count">
              {g.used}/{g.limit}
            </span>
          </div>
        ))}
      </section>

      <nav className="in-tabs" aria-label="Navigation">
        {['Heute', 'Daten', 'Fächer', 'System'].map((t, i) => (
          <button key={t} className={i === 0 ? 'is-on' : ''} aria-current={i === 0 ? 'page' : undefined}>
            {t.toUpperCase()}
          </button>
        ))}
      </nav>
    </main>
  )
}

const CX = 170
const TICK_OUT = 158
const MASK_R = 150
const MASK_C = 2 * Math.PI * MASK_R
const ARC_R = 128
const ARC_C = 2 * Math.PI * ARC_R

function polar(r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(a), y: CX + r * Math.sin(a) }
}

const TICKS = Array.from({ length: 60 }, (_, i) => {
  const major = i % 12 === 0 // alle 5 Minuten bei 25 min = alle 12 Striche
  const deg = i * 6
  const a = polar(TICK_OUT, deg)
  const b = polar(TICK_OUT - (major ? 16 : 8), deg)
  return { i, major, a, b }
})

const LABELS = [0, 5, 10, 15, 20].map((m) => ({ m, ...polar(TICK_OUT - 30, (m / 25) * 360) }))

function InstrumentTimer({ timer, onEnd }: DesignProps) {
  const maskRef = useRef<SVGCircleElement>(null)
  const arcRef = useRef<SVGCircleElement>(null)
  const needleRef = useRef<SVGGElement>(null)
  const [count, setCount] = useState(0)

  // Striche leuchten für die bereits fokussierte Zeit auf, ein Zeiger markiert „jetzt“.
  useTimerFrame(timer, (p) => {
    const clamped = Math.min(1, Math.max(0, p))
    maskRef.current?.setAttribute('stroke-dashoffset', String(MASK_C * (1 - clamped)))
    arcRef.current?.setAttribute('stroke-dashoffset', String(ARC_C * (1 - clamped)))
    needleRef.current?.setAttribute('transform', `rotate(${clamped * 360} ${CX} ${CX})`)
  })

  const done = timer.status === 'done'
  const paused = timer.status === 'paused'

  return (
    <main className={`in-timer pv-enter ${paused ? 'is-paused' : ''}`}>
      <header className="in-timer-head">
        <div>
          <span className="in-label">Session</span>
          <span className="in-timer-title">
            {SESSION.subject.name} · {SESSION.task}
          </span>
        </div>
        <div className="in-right">
          <span className="in-label">Segment</span>
          <span className="in-timer-title in-mono">
            {SESSION.round}/{SESSION.rounds}
          </span>
        </div>
      </header>

      <div className="in-dial-wrap">
        <svg className="in-dial" viewBox="0 0 340 340" aria-hidden="true">
          <defs>
            <mask id="in-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="340" height="340">
              <circle
                ref={maskRef}
                cx={CX}
                cy={CX}
                r={MASK_R}
                fill="none"
                stroke="#fff"
                strokeWidth="40"
                strokeDasharray={`${MASK_C} ${MASK_C}`}
                transform={`rotate(-90 ${CX} ${CX})`}
              />
            </mask>
          </defs>
          <g className="in-ticks">
            {TICKS.map((t) => (
              <line key={t.i} x1={t.a.x} y1={t.a.y} x2={t.b.x} y2={t.b.y} className={t.major ? 'is-major' : ''} />
            ))}
          </g>
          <g className="in-ticks is-lit" mask="url(#in-mask)">
            {TICKS.map((t) => (
              <line key={t.i} x1={t.a.x} y1={t.a.y} x2={t.b.x} y2={t.b.y} className={t.major ? 'is-major' : ''} />
            ))}
          </g>
          {LABELS.map((l) => (
            <text key={l.m} x={l.x} y={l.y} className="in-dial-label">
              {l.m}
            </text>
          ))}
          <circle cx={CX} cy={CX} r={ARC_R} className="in-arc-track" />
          <circle
            ref={arcRef}
            cx={CX}
            cy={CX}
            r={ARC_R}
            className="in-arc"
            strokeDasharray={`${ARC_C} ${ARC_C}`}
            transform={`rotate(-90 ${CX} ${CX})`}
          />
          <g ref={needleRef}>
            <path d={`M ${CX} ${CX - TICK_OUT - 6} l -6 -9 h 12 z`} className="in-needle" />
            <line x1={CX} y1={CX - TICK_OUT + 2} x2={CX} y2={CX - ARC_R + 6} className="in-needle-line" />
          </g>
        </svg>
        <div className="in-dial-center">
          {done ? (
            <>
              <span className="in-label">Status</span>
              <span className="in-clock in-done">ABGESCHLOSSEN</span>
              <span className="in-sub">25:00 · {SESSION.subject.name}</span>
            </>
          ) : (
            <>
              <span className="in-label">{paused ? 'Angehalten' : 'Verbleibend'}</span>
              <span className="in-clock">{formatClock(timer.remainingSec)}</span>
              <span className="in-sub in-mono">ENDE {endTimeLabel(timer.remainingSec)}</span>
            </>
          )}
        </div>
      </div>

      <div className="in-controls">
        <button
          className="in-btn"
          disabled={done}
          onClick={() => {
            timer.addDistraction()
            setCount((c) => c + 1)
          }}
        >
          <span className="in-label">Ablenkung</span>
          <span key={count} className="in-btn-value in-mono">
            {pad2(timer.distractions)}
          </span>
        </button>
        {done ? (
          <button className="in-btn in-btn-main" onClick={() => timer.restart(0)}>
            <span className="in-label">Neu</span>
            <span className="in-btn-value in-mono">▸ 25:00</span>
          </button>
        ) : (
          <button className="in-btn in-btn-main" onClick={paused ? timer.resume : timer.pause}>
            <span className="in-label">{paused ? 'Fortsetzen' : 'Anhalten'}</span>
            <span className="in-btn-value in-mono">{paused ? '▸' : '❚❚'}</span>
          </button>
        )}
        <button className="in-btn" onClick={onEnd}>
          <span className="in-label">{done ? 'Zurück' : 'Beenden'}</span>
          <span className="in-btn-value in-mono">■</span>
        </button>
      </div>
    </main>
  )
}
