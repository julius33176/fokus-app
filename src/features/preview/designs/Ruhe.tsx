import { useRef, useState, type CSSProperties } from 'react'
import type { DesignProps } from '../PreviewApp.tsx'
import { GATE_TODAY, MODE_COPY, PRESETS, SESSION, SUBJECTS, TODAY, formatClock, formatHours } from '../demo.ts'
import { useTimerFrame } from '../useDemoTimer.ts'
import { endTimeLabel } from './shared.ts'
import './ruhe.css'

// Richtung 3 – Ruhe: typografisch und still. Serifenschrift (New York auf dem iPhone),
// ein einziges weiches Licht, Papierkorn, ein dicker matter Ring. Wenig Bedienelemente,
// Sprache statt Kennzahlen.

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function Ruhe(props: DesignProps) {
  return (
    <div className="ru">
      <div className="ru-bg" aria-hidden="true">
        <span className="ru-light" />
        <span className="ru-grain" />
      </div>
      {props.screen === 'start' ? <RuheStart key="start" {...props} /> : <RuheTimer key="timer" {...props} />}
    </div>
  )
}

function RuheStart({ mode, onStart }: DesignProps) {
  const [subject, setSubject] = useState(SUBJECTS[0].id)
  const [preset, setPreset] = useState(PRESETS[0].id)
  const copy = MODE_COPY[mode]
  const h = Math.floor(TODAY.focusMin / 60)
  const m = TODAY.focusMin % 60
  const maxDay = Math.max(...TODAY.week, 1)
  const chosen = SUBJECTS.find((s) => s.id === subject) ?? SUBJECTS[0]

  return (
    <main className="ru-start pv-enter">
      <header className="ru-head">
        <p className="ru-date">{TODAY.dateLabel}</p>
        <h1 className="ru-title">{copy.greeting}.</h1>
      </header>

      <p className="ru-sentence">
        Heute hast du <em>{h} Stunde{h === 1 ? '' : 'n'}</em> und <em>{m} Minuten</em> gelernt. {copy.line}
      </p>

      <section className="ru-week" aria-label="Diese Woche">
        <ol className="ru-dots">
          {TODAY.week.map((min, i) => (
            <li key={i} className={i === 4 ? 'is-today' : ''}>
              <span
                className="ru-dot"
                style={{ '--fill': min / maxDay } as CSSProperties}
                aria-label={`${DAY_NAMES[i]}: ${min} Minuten`}
              />
              <span className="ru-dot-day">{DAY_NAMES[i]}</span>
            </li>
          ))}
        </ol>
        <p className="ru-small">
          {formatHours(TODAY.weekMin)} von {formatHours(TODAY.weekGoalMin)} Stunden diese Woche ·{' '}
          {TODAY.streakDays} Tage in Folge
        </p>
      </section>

      <section className="ru-begin" aria-label="Session beginnen">
        <div className="ru-choice" role="radiogroup" aria-label="Fach">
          {SUBJECTS.map((s) => (
            <button key={s.id} role="radio" aria-checked={s.id === subject} onClick={() => setSubject(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="ru-choice ru-choice-small" role="radiogroup" aria-label="Takt">
          {PRESETS.map((p) => (
            <button key={p.id} role="radio" aria-checked={p.id === preset} onClick={() => setPreset(p.id)}>
              {p.name}
            </button>
          ))}
        </div>
        <button className="ru-cta" onClick={onStart}>
          <span className="ru-cta-label">Beginnen</span>
          <span className="ru-cta-sub">{chosen.long}</span>
        </button>
      </section>

      <p className="ru-limits">
        {GATE_TODAY.map((g, i) => (
          <span key={g.id}>
            {g.name} {g.used} von {g.limit}
            {i < GATE_TODAY.length - 1 ? ' · ' : ''}
          </span>
        ))}
      </p>

      <nav className="ru-tabs" aria-label="Navigation">
        {['Heute', 'Verlauf', 'Fächer', 'Mehr'].map((t, i) => (
          <button key={t} className={i === 0 ? 'is-on' : ''} aria-current={i === 0 ? 'page' : undefined}>
            {t}
          </button>
        ))}
      </nav>
    </main>
  )
}

const R = 136
const C = 2 * Math.PI * R

function RuheTimer({ timer, onEnd }: DesignProps) {
  const arcRef = useRef<SVGCircleElement>(null)
  const [bump, setBump] = useState(0)

  // Ring füllt sich mit der fokussierten Zeit – ein ruhiges „Volllaufen“.
  useTimerFrame(timer, (p) => {
    const clamped = Math.min(1, Math.max(0, p))
    arcRef.current?.setAttribute('stroke-dashoffset', String(C * (1 - clamped)))
  })

  const done = timer.status === 'done'
  const paused = timer.status === 'paused'
  const minutesLeft = Math.ceil(timer.remainingSec / 60)

  return (
    <main className={`ru-timer pv-enter ${paused ? 'is-paused' : ''}`}>
      <header className="ru-timer-head">
        <p className="ru-timer-subject">{SESSION.subject.long}</p>
        <p className="ru-small">
          {SESSION.task} · Runde {SESSION.round} von {SESSION.rounds}
        </p>
      </header>

      <div className="ru-ring-wrap">
        <svg className="ru-ring" viewBox="0 0 320 320" aria-hidden="true">
          <circle cx="160" cy="160" r={R} className="ru-ring-track" />
          <circle
            ref={arcRef}
            cx="160"
            cy="160"
            r={R}
            className="ru-ring-arc"
            strokeDasharray={`${C} ${C}`}
            transform="rotate(-90 160 160)"
          />
        </svg>
        <div className="ru-ring-center">
          {done ? (
            <>
              <span className="ru-clock ru-clock-done">Gut gemacht.</span>
              <span className="ru-small">25 Minuten {SESSION.subject.long}</span>
            </>
          ) : (
            <>
              <span className="ru-clock">{formatClock(timer.remainingSec)}</span>
              <span className="ru-small">
                {paused ? 'pausiert' : `noch ${minutesLeft} Minuten · bis ${endTimeLabel(timer.remainingSec)}`}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="ru-actions">
        <button
          className="ru-action"
          disabled={done}
          onClick={() => {
            timer.addDistraction()
            setBump((b) => b + 1)
          }}
        >
          Abgelenkt
          <span key={bump} className="ru-count">
            {timer.distractions}
          </span>
        </button>
        {done ? (
          <button className="ru-action ru-action-main" onClick={() => timer.restart(0)}>
            Noch eine Runde
          </button>
        ) : (
          <button className="ru-action ru-action-main" onClick={paused ? timer.resume : timer.pause}>
            {paused ? 'Weiter' : 'Pause'}
          </button>
        )}
        <button className="ru-action" onClick={onEnd}>
          {done ? 'Zurück' : 'Beenden'}
        </button>
      </div>
    </main>
  )
}
