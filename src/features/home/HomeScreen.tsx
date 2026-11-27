import { useMemo, useState } from 'react'
import { useAppState } from '../../app/store.ts'
import { startSession } from '../../app/timerController.ts'
import { dayKey, formatDayLong, weekKeys, weekdayIndex, WEEKDAY_SHORT } from '../../domain/dates.ts'
import { daypartOf, greeting } from '../../domain/daypart.ts'
import { formatDuration, formatHoursDecimal, streak, sumDays, totalsByDay } from '../../domain/stats.ts'
import { configFromPreset, freeConfig } from '../../domain/timer.ts'
import { navigate } from '../../router/router.ts'
import { Stepper } from '../../ui/components.tsx'
import { IconFlame, IconPlay } from '../../ui/icons.tsx'
import './home.css'

const MIN = 60_000

export function HomeScreen() {
  const { settings, subjects, tasks, sessions, activeTimer } = useAppState()
  const now = Date.now()
  const today = dayKey(now, settings.dayStartHour)
  const active = subjects.filter((s) => !s.archived)

  const totals = useMemo(() => totalsByDay(sessions), [sessions])
  const week = weekKeys(today)
  const todayMs = totals.get(today) ?? 0
  const weekMs = sumDays(totals, week)
  const goalMs = settings.weeklyGoalMin * MIN
  const st = streak(totals, today, settings.streakMinPerDay * MIN)
  const todaySessions = sessions.filter((s) => s.day === today).length
  const maxDay = Math.max(1, ...week.map((k) => totals.get(k) ?? 0))
  const t = formatDuration(todayMs)

  const [subjectId, setSubjectId] = useState(() =>
    active.some((s) => s.id === settings.lastSubjectId) ? settings.lastSubjectId! : active[0]?.id,
  )
  const [presetId, setPresetId] = useState<string>(settings.defaultPresetId)
  const [freeMin, setFreeMin] = useState(settings.freeDefaultMin)
  const [taskId, setTaskId] = useState<string | undefined>(undefined)
  const openTasks = tasks.filter((x) => x.subjectId === subjectId && !x.done)

  const start = async () => {
    if (!subjectId) return
    const preset = settings.presets.find((p) => p.id === presetId)
    const config = preset ? configFromPreset(preset) : freeConfig(freeMin)
    await startSession(config, subjectId, openTasks.some((x) => x.id === taskId) ? taskId : undefined)
    navigate('timer')
  }

  return (
    <main className="screen home enter">
      <header className="home-head">
        <p className="kicker">{formatDayLong(today)}</p>
        <h1 className="home-greeting">{greeting(daypartOf(new Date(now)), settings.name, today)}</h1>
      </header>

      <section className="home-hero" aria-label="Heute gelernt">
        <p className="home-label">Heute gelernt</p>
        <p className="home-big" aria-label={`${t.h > 0 ? `${t.h} Stunden ` : ''}${t.m} Minuten`}>
          {t.h > 0 && (
            <>
              {t.h}
              <span className="home-unit">h</span>{' '}
            </>
          )}
          {t.h > 0 ? String(t.m).padStart(2, '0') : t.m}
          <span className="home-unit">min</span>
        </p>
        <p className="home-meta">
          <span>
            {todaySessions} {todaySessions === 1 ? 'Session' : 'Sessions'}
          </span>
          <span className={`home-streak ${st.todayDone ? 'is-done' : ''}`}>
            <IconFlame size={15} /> {st.days} {st.days === 1 ? 'Tag' : 'Tage'}
            {!st.todayDone && st.days > 0 && <span className="faint"> · heute noch offen</span>}
          </span>
        </p>
      </section>

      <section className="glass card" aria-label="Wochenziel">
        <div className="card-head">
          <span className="card-title">Woche</span>
          <span className="card-value">
            {formatHoursDecimal(weekMs)} <small>von {formatHoursDecimal(goalMs)} h</small>
          </span>
        </div>
        <div
          className="bar home-weekbar"
          role="progressbar"
          aria-label="Wochenziel"
          aria-valuenow={Math.round((weekMs / goalMs) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ transform: `scaleX(${Math.min(1, weekMs / goalMs)})` }} />
        </div>
        <ol className="home-days">
          {week.map((k) => {
            const ms = totals.get(k) ?? 0
            return (
              <li key={k} className={k === today ? 'is-today' : ''}>
                <span className="home-day-bar" style={{ transform: `scaleY(${Math.max(0.06, ms / maxDay)})` }} />
                <span className="home-day-name">{WEEKDAY_SHORT[weekdayIndex(k)].charAt(0)}</span>
                <span className="sr-only">{Math.round(ms / MIN)} Minuten</span>
              </li>
            )
          })}
        </ol>
      </section>

      {activeTimer ? (
        <button className="glass card home-running pressable" onClick={() => navigate('timer')}>
          <span className="home-running-dot" />
          <span className="home-running-text">
            <span className="card-title">Session läuft</span>
            <span className="muted">{subjects.find((s) => s.id === activeTimer.subjectId)?.name ?? 'Fach'}</span>
          </span>
          <span className="btn btn-plain">Öffnen</span>
        </button>
      ) : active.length === 0 ? (
        <section className="glass card home-empty">
          <p className="card-title">Noch keine Fächer</p>
          <p className="muted">Lege ein Fach an, dann kannst du loslegen.</p>
          <button className="btn" onClick={() => navigate('subjects')}>
            Fach anlegen
          </button>
        </section>
      ) : (
        <section className="glass home-quick" aria-label="Schnellstart">
          <div className="chips" role="radiogroup" aria-label="Fach">
            {active.map((s) => (
              <button
                key={s.id}
                role="radio"
                aria-checked={subjectId === s.id}
                className={`chip ${subjectId === s.id ? 'is-on' : ''}`}
                onClick={() => {
                  setSubjectId(s.id)
                  setTaskId(undefined)
                }}
              >
                <span className="chip-dot" style={{ background: s.color }} />
                {s.name}
              </button>
            ))}
          </div>

          {openTasks.length > 0 && (
            <div className="chips" role="radiogroup" aria-label="Aufgabe">
              <button
                role="radio"
                aria-checked={!taskId}
                className={`chip chip-quiet ${!taskId ? 'is-on' : ''}`}
                onClick={() => setTaskId(undefined)}
              >
                Ohne Aufgabe
              </button>
              {openTasks.map((x) => (
                <button
                  key={x.id}
                  role="radio"
                  aria-checked={taskId === x.id}
                  className={`chip chip-quiet ${taskId === x.id ? 'is-on' : ''}`}
                  onClick={() => setTaskId(x.id)}
                >
                  {x.title}
                </button>
              ))}
            </div>
          )}

          <div className="chips" role="radiogroup" aria-label="Takt">
            {settings.presets.map((p) => (
              <button
                key={p.id}
                role="radio"
                aria-checked={presetId === p.id}
                className={`chip chip-quiet ${presetId === p.id ? 'is-on' : ''}`}
                onClick={() => setPresetId(p.id)}
              >
                {p.name}
              </button>
            ))}
            <button
              role="radio"
              aria-checked={presetId === 'free'}
              className={`chip chip-quiet ${presetId === 'free' ? 'is-on' : ''}`}
              onClick={() => setPresetId('free')}
            >
              Frei
            </button>
          </div>

          {presetId === 'free' && (
            <div className="home-free">
              <span className="muted">Dauer</span>
              <Stepper value={freeMin} onChange={setFreeMin} min={5} max={180} step={5} format={(v) => `${v} min`} label="Dauer" />
            </div>
          )}

          <button className="cta" onClick={start} disabled={!subjectId}>
            <IconPlay size={18} />
            Fokus starten
          </button>
        </section>
      )}
    </main>
  )
}
