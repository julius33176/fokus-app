import { useRef, useState } from 'react'
import type { DesignProps } from '../PreviewApp.tsx'
import {
  GATE_TODAY,
  MODE_COPY,
  PRESETS,
  SESSION,
  SUBJECTS,
  TODAY,
  formatClock,
  formatHM,
  formatHours,
} from '../demo.ts'
import { IconBook, IconChevronDown, IconFlame, IconPause, IconPlay, IconPlus, IconSettings, IconStats, IconToday, IconBell, IconCheck } from '../icons.tsx'
import { useTimerFrame } from '../useDemoTimer.ts'
import { endTimeLabel } from './shared.ts'
import './aurora.css'

// Richtung 1 – Aurora: atmosphärischer Farbverlauf, Glas-Flächen, leuchtender Ring,
// sehr große, dünne Ziffern. Wirkt wie eine System-App (Wetter/Fitness).

export function Aurora(props: DesignProps) {
  return (
    <div className="au">
      <div className="au-sky" aria-hidden="true">
        <span className="au-blob au-blob-1" />
        <span className="au-blob au-blob-2" />
        <span className="au-blob au-blob-3" />
      </div>
      {props.screen === 'start' ? (
        <AuroraStart key="start" {...props} />
      ) : (
        <AuroraTimer key="timer" {...props} />
      )}
    </div>
  )
}

function AuroraStart({ mode, onStart }: DesignProps) {
  const [subject, setSubject] = useState(SUBJECTS[0].id)
  const [preset, setPreset] = useState(PRESETS[0].id)
  const today = formatHM(TODAY.focusMin)
  const copy = MODE_COPY[mode]
  const weekPct = Math.min(1, TODAY.weekMin / TODAY.weekGoalMin)
  const maxDay = Math.max(...TODAY.week, 1)

  return (
    <main className="au-start pv-enter">
      <header className="au-head">
        <p className="au-date">{TODAY.dateLabel}</p>
        <h1 className="au-greeting">{copy.greeting}</h1>
        <p className="au-line">{copy.line}</p>
      </header>

      <section className="au-hero" aria-label="Heute gelernt">
        <p className="au-label">Heute gelernt</p>
        <p className="au-big tabular">
          {today.h}
          <span className="au-unit">h</span> {today.m}
          <span className="au-unit">min</span>
        </p>
        <p className="au-meta">
          <span>{TODAY.sessions} Sessions</span>
          <span className="au-meta-streak">
            <IconFlame size={15} /> {TODAY.streakDays} Tage
          </span>
        </p>
      </section>

      <section className="au-glass au-week" aria-label="Wochenziel">
        <div className="au-row">
          <span className="au-card-title">Woche</span>
          <span className="au-card-value tabular">
            {formatHours(TODAY.weekMin)} <span>von {formatHours(TODAY.weekGoalMin)} h</span>
          </span>
        </div>
        <div className="au-bar" role="progressbar" aria-valuenow={Math.round(weekPct * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ transform: `scaleX(${weekPct})` }} />
        </div>
        <ol className="au-days">
          {TODAY.week.map((min, i) => (
            <li key={i} className={i === 4 ? 'is-today' : ''}>
              <span className="au-day-bar" style={{ transform: `scaleY(${Math.max(0.06, min / maxDay)})` }} />
              <span className="au-day-name">{['M', 'D', 'M', 'D', 'F', 'S', 'S'][i]}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="au-glass au-quick" aria-label="Schnellstart">
        <div className="au-chips" role="radiogroup" aria-label="Fach">
          {SUBJECTS.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={subject === s.id}
              className={`au-chip ${subject === s.id ? 'is-on' : ''}`}
              onClick={() => setSubject(s.id)}
            >
              {s.name}
            </button>
          ))}
          <span className="au-chips-sep" />
          {PRESETS.map((p) => (
            <button
              key={p.id}
              role="radio"
              aria-checked={preset === p.id}
              className={`au-chip au-chip-quiet ${preset === p.id ? 'is-on' : ''}`}
              onClick={() => setPreset(p.id)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <button className="au-cta" onClick={onStart}>
          <IconPlay size={18} />
          Fokus starten
        </button>
      </section>

      <section className="au-limits" aria-label="Scroll-Limits heute">
        {GATE_TODAY.map((g) => (
          <div key={g.id} className="au-limit">
            <span className="au-limit-name">{g.name}</span>
            <span className="au-limit-count tabular">
              {g.used}/{g.limit}
            </span>
            <span className="au-limit-track">
              <span style={{ transform: `scaleX(${g.used / g.limit})` }} />
            </span>
          </div>
        ))}
      </section>

      <nav className="au-tabs" aria-label="Navigation">
        <button className="is-on" aria-current="page">
          <IconToday />
          <span>Heute</span>
        </button>
        <button>
          <IconStats />
          <span>Statistik</span>
        </button>
        <button>
          <IconBook />
          <span>Fächer</span>
        </button>
        <button>
          <IconSettings />
          <span>Mehr</span>
        </button>
      </nav>
    </main>
  )
}

const R = 146
const C = 2 * Math.PI * R

function AuroraTimer({ timer, onEnd }: DesignProps) {
  const arcRef = useRef<SVGCircleElement>(null)
  const headRef = useRef<SVGGElement>(null)
  const [bump, setBump] = useState(0)

  // Ring zeigt die verbleibende Zeit: er wird im Uhrzeigersinn „aufgezehrt“ wie beim iOS-Timer.
  useTimerFrame(timer, (p) => {
    const rest = Math.max(0, 1 - p)
    arcRef.current?.setAttribute('stroke-dasharray', `${C * rest} ${C}`)
    arcRef.current?.setAttribute('stroke-dashoffset', String(-C * p))
    headRef.current?.setAttribute('transform', `rotate(${p * 360} 160 160)`)
    // Bei leerem Bogen würde die runde Linienkappe einen Punkt zeichnen → ausblenden
    const visible = rest > 0.002 ? '1' : '0'
    headRef.current?.setAttribute('opacity', visible)
    arcRef.current?.setAttribute('opacity', visible)
  })

  const done = timer.status === 'done'
  const paused = timer.status === 'paused'

  return (
    <main className={`au-timer pv-enter ${paused ? 'is-paused' : ''}`}>
      <header className="au-timer-head">
        <button className="au-icon-btn" onClick={onEnd} aria-label="Zurück zum Start">
          <IconChevronDown />
        </button>
        <div className="au-timer-title">
          <span className="au-timer-subject">
            {SESSION.subject.long} · {SESSION.task}
          </span>
          <span className="au-timer-round tabular">
            Runde {SESSION.round} von {SESSION.rounds}
          </span>
        </div>
        <span className="au-icon-btn is-ghost" />
      </header>

      <div className="au-ring-wrap">
        <div className="au-ring-glow" aria-hidden="true" />
        <svg className="au-ring" viewBox="0 0 320 320" aria-hidden="true">
          <defs>
            <linearGradient id="au-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--m-accent)" />
              <stop offset="1" stopColor="var(--m-accent-2)" />
            </linearGradient>
          </defs>
          <circle cx="160" cy="160" r={R} className="au-ring-track" />
          <circle
            ref={arcRef}
            cx="160"
            cy="160"
            r={R}
            className="au-ring-arc"
            stroke="url(#au-grad)"
            transform="rotate(-90 160 160)"
          />
          <g ref={headRef}>
            <circle cx="160" cy={160 - R} r="7" className="au-ring-head" />
          </g>
        </svg>
        <div className="au-ring-center">
          {done ? (
            <>
              <span className="au-done-icon">
                <IconCheck size={34} />
              </span>
              <span className="au-done-title">Geschafft</span>
              <span className="au-ring-sub">25 min {SESSION.subject.name}</span>
            </>
          ) : (
            <>
              <span className="au-clock tabular" aria-live="off">
                {formatClock(timer.remainingSec)}
              </span>
              <span className="au-ring-sub">
                <IconBell size={14} /> {endTimeLabel(timer.remainingSec)}
              </span>
            </>
          )}
        </div>
      </div>

      <button
        className="au-distract"
        onClick={() => {
          timer.addDistraction()
          setBump((b) => b + 1)
        }}
        disabled={done}
      >
        <IconPlus size={16} />
        Ablenkung
        <span key={bump} className="au-distract-count tabular">
          {timer.distractions}
        </span>
      </button>

      <div className="au-controls">
        <button className="au-round au-round-quiet" onClick={onEnd}>
          {done ? 'Fertig' : 'Beenden'}
        </button>
        {done ? (
          <button className="au-round au-round-main" onClick={() => timer.restart(0)}>
            Nochmal
          </button>
        ) : (
          <button
            className="au-round au-round-main"
            onClick={paused ? timer.resume : timer.pause}
            aria-label={paused ? 'Fortsetzen' : 'Pausieren'}
          >
            {paused ? <IconPlay size={26} /> : <IconPause size={26} />}
            <span>{paused ? 'Weiter' : 'Pause'}</span>
          </button>
        )}
      </div>
    </main>
  )
}
