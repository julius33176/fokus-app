import { useEffect, useRef, useState } from 'react'
import { getState, useAppState } from '../../app/store.ts'
import * as ctl from '../../app/timerController.ts'
import * as T from '../../domain/timer.ts'
import { navigate } from '../../router/router.ts'
import { Sheet } from '../../ui/components.tsx'
import { IconBell, IconCheck, IconChevronDown, IconPause, IconPlay, IconPlus } from '../../ui/icons.tsx'
import { useWakeLock } from './useWakeLock.ts'
import './timer.css'

const R = 146
const C = 2 * Math.PI * R

function clock(ms: number) {
  const total = Math.ceil(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timeOfDay(ts: number) {
  return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export function TimerScreen() {
  const { activeTimer: t, subjects, tasks, sessions, ratingSessionId, settings } = useAppState()
  const arcRef = useRef<SVGCircleElement>(null)
  const headRef = useRef<SVGGElement>(null)
  const [remaining, setRemaining] = useState(() => (t ? T.remainingMs(t, Date.now()) : 0))
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [bump, setBump] = useState(0)

  const running = !!t && !T.isPaused(t) && remaining > 0
  useWakeLock(running && settings.keepScreenOn)

  // Ring und Uhr pro Frame aus dem gespeicherten Zustand berechnen (kein React-Render pro Frame)
  useEffect(() => {
    let frame = 0
    let lastSec = -1
    const draw = () => {
      const cur = getState().activeTimer
      if (cur) {
        const now = Date.now()
        const p = T.progress(cur, now)
        const rest = 1 - p
        const visible = rest > 0.002 ? '1' : '0'
        arcRef.current?.setAttribute('stroke-dasharray', `${C * rest} ${C}`)
        arcRef.current?.setAttribute('stroke-dashoffset', String(-C * p))
        arcRef.current?.setAttribute('opacity', visible)
        headRef.current?.setAttribute('transform', `rotate(${p * 360} 160 160)`)
        headRef.current?.setAttribute('opacity', visible)
        const rem = T.remainingMs(cur, now)
        const sec = Math.ceil(rem / 1000)
        if (sec !== lastSec) {
          lastSec = sec
          setRemaining(rem)
        }
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [])

  // Keine Session und nichts zu bewerten → zurück zum Start
  useEffect(() => {
    if (!t && !ratingSessionId) navigate('', { replace: true })
  }, [t, ratingSessionId])

  const done = !t && ratingSessionId ? sessions.find((s) => s.id === ratingSessionId) : undefined
  const subject = subjects.find((s) => s.id === (t?.subjectId ?? done?.subjectId))
  const task = tasks.find((x) => x.id === (t?.taskId ?? done?.taskId))
  const paused = !!t && T.isPaused(t)
  const isBreak = !!t && t.phase !== 'focus'
  const breakOver = isBreak && remaining <= 0

  let subline = ''
  if (t) {
    if (t.config.mode === 'pomodoro') {
      const rounds = t.config.roundsUntilLong
      const inCycle = ((t.round - 1) % rounds) + 1
      subline =
        t.phase === 'focus'
          ? `Runde ${inCycle} von ${rounds}`
          : t.phase === 'longBreak'
            ? 'Lange Pause'
            : 'Kurze Pause'
    } else subline = 'Freie Session'
  }

  return (
    <main className={`timer enter ${paused ? 'is-paused' : ''} ${isBreak ? 'is-break' : ''}`}>
      <header className="timer-head">
        <button className="icon-btn" onClick={() => navigate('')} aria-label="Zum Start (Timer läuft weiter)">
          <IconChevronDown />
        </button>
        <div className="timer-title">
          <span className="timer-subject">
            {subject?.name ?? 'Fach'}
            {task ? ` · ${task.title}` : ''}
          </span>
          <span className="timer-sub">{subline}</span>
        </div>
        <span className="icon-btn is-ghost" aria-hidden="true" />
      </header>

      <div className="ring-wrap">
        <div className="ring-glow" aria-hidden="true" />
        <svg className="ring" viewBox="0 0 320 320" aria-hidden="true">
          <defs>
            <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--m-accent)" />
              <stop offset="1" stopColor="var(--m-accent-2)" />
            </linearGradient>
          </defs>
          <circle cx="160" cy="160" r={R} className="ring-track" />
          <circle ref={arcRef} cx="160" cy="160" r={R} className="ring-arc" stroke="url(#ring-grad)" transform="rotate(-90 160 160)" />
          <g ref={headRef}>
            <circle cx="160" cy={160 - R} r="7" className="ring-head" />
          </g>
        </svg>
        <div className="ring-center" role="timer" aria-live="off">
          {done ? (
            <>
              <span className="done-icon">
                <IconCheck size={34} />
              </span>
              <span className="done-title">Geschafft</span>
              <span className="ring-sub">{Math.round(done.focusMs / 60_000)} min fokussiert</span>
            </>
          ) : breakOver ? (
            <>
              <span className="done-title">Pause vorbei</span>
              <span className="ring-sub">Bereit für die nächste Runde?</span>
            </>
          ) : (
            <>
              <span className="clock">{clock(remaining)}</span>
              <span className="ring-sub">
                {paused ? (
                  'pausiert'
                ) : (
                  <>
                    <IconBell size={14} /> {timeOfDay(Date.now() + remaining)}
                  </>
                )}
              </span>
            </>
          )}
        </div>
      </div>

      {t?.phase === 'focus' && (
        <button
          className="distract"
          onClick={() => {
            void ctl.addDistraction()
            setBump((b) => b + 1)
          }}
          disabled={remaining <= 0}
        >
          <IconPlus size={16} />
          Ablenkung
          <span key={bump} className="distract-count">
            {t.distractions.length}
          </span>
        </button>
      )}
      {isBreak && !breakOver && <p className="timer-hint">Steh auf, trink etwas, schau aus dem Fenster.</p>}

      <div className="controls">
        {done ? (
          <>
            <span />
            <button className="round-btn round-main" onClick={() => navigate('')}>
              Fertig
            </button>
          </>
        ) : t?.phase === 'focus' ? (
          <>
            <button className="round-btn round-quiet" onClick={() => setConfirmEnd(true)}>
              Beenden
            </button>
            <button className="round-btn round-main" onClick={() => void ctl.togglePause()} aria-label={paused ? 'Fortsetzen' : 'Pausieren'}>
              {paused ? <IconPlay size={26} /> : <IconPause size={26} />}
              <span>{paused ? 'Weiter' : 'Pause'}</span>
            </button>
          </>
        ) : t ? (
          <>
            <button className="round-btn round-quiet" onClick={() => void ctl.endSequence()}>
              Fertig
            </button>
            <button className="round-btn round-main" onClick={() => void ctl.startNextRound()}>
              {breakOver ? 'Los' : 'Weiter'}
              <span>{breakOver ? 'nächste Runde' : 'Pause überspringen'}</span>
            </button>
          </>
        ) : null}
      </div>

      <Sheet open={confirmEnd} onClose={() => setConfirmEnd(false)} label="Session beenden">
        <h2 className="sheet-title">Session beenden?</h2>
        <p className="muted">
          {t ? `Bisher ${Math.floor(T.elapsedMs(t, Date.now()) / 60_000)} min fokussiert.` : ''} Gespeichert wird nur, was ab einer
          Minute zusammenkommt.
        </p>
        <div className="sheet-actions">
          <button
            className="btn"
            onClick={() => {
              setConfirmEnd(false)
              void ctl.abortFocus(true)
            }}
          >
            Beenden und speichern
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              setConfirmEnd(false)
              void ctl.abortFocus(false)
            }}
          >
            Verwerfen
          </button>
          <button className="btn btn-plain" onClick={() => setConfirmEnd(false)}>
            Weiterlernen
          </button>
        </div>
      </Sheet>
    </main>
  )
}
