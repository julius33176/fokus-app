import { useMemo, useState } from 'react'
import { actions, useAppState } from '../../app/store.ts'
import { addDays, dateOfKey, dayKey, isoWeek, weekKeys, weekdayIndex, WEEKDAY_SHORT } from '../../domain/dates.ts'
import {
  averageDistractions,
  formatDurationText,
  formatHoursDecimal,
  streak,
  sumDays,
  totalsByDay,
  totalsBySubject,
} from '../../domain/stats.ts'
import './stats.css'

const MIN = 60_000

export function StatsScreen() {
  const { sessions, subjects, settings } = useAppState()
  const today = dayKey(Date.now(), settings.dayStartHour)
  const [weekOffset, setWeekOffset] = useState(0)

  const week = weekKeys(addDays(today, weekOffset * 7))
  const weekSet = new Set(week)
  const totals = useMemo(() => totalsByDay(sessions), [sessions])
  const weekMs = sumDays(totals, week)
  const goalMs = settings.weeklyGoalMin * MIN
  const st = streak(totals, today, settings.streakMinPerDay * MIN)
  const allMs = sessions.reduce((s, x) => s + x.focusMs, 0)
  const weekSessions = sessions.filter((s) => weekSet.has(s.day)).sort((a, b) => b.startedAt - a.startedAt)
  const bySubject = [...totalsBySubject(sessions, weekSet).entries()].sort((a, b) => b[1] - a[1])
  const maxDay = Math.max(1, ...week.map((k) => totals.get(k) ?? 0))
  const maxSubject = Math.max(1, ...bySubject.map(([, ms]) => ms))
  const rated = weekSessions.filter((s) => s.rating)
  const avgRating = rated.length ? rated.reduce((s, x) => s + (x.rating ?? 0), 0) / rated.length : null
  const subjectOf = (id: string) => subjects.find((s) => s.id === id)

  const rangeLabel = `${dateOfKey(week[0]).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })} – ${dateOfKey(
    week[6],
  ).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}`

  return (
    <main className="screen enter">
      <h1 className="screen-title">Statistik</h1>

      <div className="stats-tiles">
        <div className="glass stats-tile">
          <span className="stats-tile-label">Serie</span>
          <span className="stats-tile-value">
            {st.days}
            <small> {st.days === 1 ? 'Tag' : 'Tage'}</small>
          </span>
          <span className="stats-tile-sub">ab {settings.streakMinPerDay} min/Tag</span>
        </div>
        <div className="glass stats-tile">
          <span className="stats-tile-label">Gesamt</span>
          <span className="stats-tile-value">
            {formatHoursDecimal(allMs)}
            <small> h</small>
          </span>
          <span className="stats-tile-sub">
            {sessions.length} {sessions.length === 1 ? 'Session' : 'Sessions'}
          </span>
        </div>
      </div>

      <section className="glass card" aria-label="Woche">
        <div className="stats-weeknav">
          <button className="icon-btn" aria-label="Vorherige Woche" onClick={() => setWeekOffset((w) => w - 1)}>
            ‹
          </button>
          <div className="stats-weeklabel">
            <span className="card-title">KW {isoWeek(week[0])}</span>
            <span className="faint">{rangeLabel}</span>
          </div>
          <button className="icon-btn" aria-label="Nächste Woche" onClick={() => setWeekOffset((w) => Math.min(0, w + 1))} disabled={weekOffset >= 0}>
            ›
          </button>
        </div>
        <div className="card-head stats-weeksum">
          <span className="muted">Fokuszeit</span>
          <span className="card-value">
            {formatHoursDecimal(weekMs)} <small>von {formatHoursDecimal(goalMs)} h</small>
          </span>
        </div>
        <div className="bar">
          <span style={{ transform: `scaleX(${Math.min(1, weekMs / goalMs)})` }} />
        </div>
        <ol className="stats-days">
          {week.map((k) => {
            const ms = totals.get(k) ?? 0
            return (
              <li key={k} className={k === today ? 'is-today' : ''}>
                <span className="stats-day-min">{ms ? Math.round(ms / MIN) : ''}</span>
                <span className="stats-day-col">
                  <span style={{ transform: `scaleY(${ms / maxDay})` }} />
                </span>
                <span className="stats-day-name">{WEEKDAY_SHORT[weekdayIndex(k)]}</span>
              </li>
            )
          })}
        </ol>
        <p className="faint stats-note">Minuten pro Tag</p>
      </section>

      <section className="glass card" aria-label="Fächer dieser Woche">
        <div className="card-head">
          <span className="card-title">Pro Fach</span>
        </div>
        {bySubject.length === 0 ? (
          <p className="faint stats-empty">In dieser Woche noch keine Sessions.</p>
        ) : (
          <ul className="stats-subjects">
            {bySubject.map(([id, ms]) => {
              const s = subjectOf(id)
              return (
                <li key={id}>
                  <span className="stats-subject-head">
                    <span>{s?.name ?? 'Gelöschtes Fach'}</span>
                    <span className="muted">{formatDurationText(ms)}</span>
                  </span>
                  <span className="stats-subject-track">
                    <span style={{ transform: `scaleX(${ms / maxSubject})`, background: s?.color ?? 'var(--text-3)' }} />
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="stats-tiles">
        <div className="glass stats-tile">
          <span className="stats-tile-label">Ablenkungen</span>
          <span className="stats-tile-value">
            {averageDistractions(weekSessions).toLocaleString('de-DE', { maximumFractionDigits: 1 })}
            <small> Ø</small>
          </span>
          <span className="stats-tile-sub">pro Session</span>
        </div>
        <div className="glass stats-tile">
          <span className="stats-tile-label">Konzentration</span>
          <span className="stats-tile-value">
            {avgRating ? avgRating.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : '–'}
            <small> / 5</small>
          </span>
          <span className="stats-tile-sub">Ø dieser Woche</span>
        </div>
      </div>

      <p className="section-label">Sessions dieser Woche</p>
      <section className="glass list">
        {weekSessions.length === 0 && <p className="empty">Noch nichts. Die erste Session wartet.</p>}
        {weekSessions.map((x) => {
          const s = subjectOf(x.subjectId)
          const start = new Date(x.startedAt)
          return (
            <button key={x.id} className="row stats-session pressable" onClick={() => actions.openRating(x.id)}>
              <span className="subject-dot" style={{ background: s?.color ?? 'var(--text-3)' }} />
              <span className="row-label">
                {s?.name ?? 'Gelöschtes Fach'}
                <span className="row-sub">
                  {start.toLocaleDateString('de-DE', { weekday: 'short' })},{' '}
                  {start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · {x.distractions.length} Abl.
                  {x.status === 'aborted' ? ' · abgebrochen' : ''}
                  {x.note ? ' · Notiz' : ''}
                </span>
              </span>
              <span className="stats-session-right">
                <span className="card-value">{Math.round(x.focusMs / MIN)} min</span>
                <span className="stats-rating" aria-label={x.rating ? `Konzentration ${x.rating} von 5` : 'nicht bewertet'}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={x.rating && n <= x.rating ? 'is-on' : ''} />
                  ))}
                </span>
              </span>
            </button>
          )
        })}
      </section>
    </main>
  )
}
