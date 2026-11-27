import { describe, expect, it } from 'vitest'
import { addDays, dayKey, isoWeek, weekKeys, weekdayIndex } from './dates.ts'
import { daypartOf, greeting } from './daypart.ts'
import { streak, totalsByDay, totalsBySubject } from './stats.ts'
import {
  addDistraction,
  breakAfter,
  configFromPreset,
  elapsedMs,
  freeConfig,
  isPaused,
  isPhaseDone,
  nextPhase,
  pause,
  phaseEndAt,
  remainingMs,
  resume,
  startFocus,
  toSessionRecord,
  type SessionRecord,
} from './timer.ts'

const MIN = 60_000
const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime()

describe('Tagesgrenze 04:00', () => {
  it('ordnet 01:30 dem Vortag zu, 04:00 dem neuen Tag', () => {
    expect(dayKey(at(2026, 11, 27, 1, 30))).toBe('2026-11-26')
    expect(dayKey(at(2026, 11, 27, 3, 59))).toBe('2026-11-26')
    expect(dayKey(at(2026, 11, 27, 4, 0))).toBe('2026-11-27')
    expect(dayKey(at(2026, 11, 27, 23, 59))).toBe('2026-11-27')
  })

  it('funktioniert über Monats- und Jahresgrenzen', () => {
    expect(dayKey(at(2027, 1, 1, 2, 0))).toBe('2026-12-31')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('bleibt bei Zeitumstellung korrekt (29.03.2026, 02:00 → 03:00)', () => {
    expect(dayKey(at(2026, 3, 29, 3, 30))).toBe('2026-03-28')
    expect(dayKey(at(2026, 3, 29, 5, 0))).toBe('2026-03-29')
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29')
  })

  it('liefert die Woche Mo–So und die KW', () => {
    expect(weekKeys('2026-11-27')).toEqual([
      '2026-11-23',
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
      '2026-11-28',
      '2026-11-29',
    ])
    expect(weekdayIndex('2026-11-27')).toBe(4)
    expect(weekKeys('2026-11-29')[0]).toBe('2026-11-23')
    expect(isoWeek('2026-11-27')).toBe(48)
    expect(isoWeek('2027-01-01')).toBe(53)
  })
})

describe('Timer-Automat', () => {
  const pomo = configFromPreset({ id: 'pomo', name: '25 / 5', focusMin: 25, shortBreakMin: 5, longBreakMin: 15, roundsUntilLong: 4 })
  const t0 = at(2026, 11, 27, 10, 0)

  it('rechnet Rest- und Laufzeit aus Zeitstempeln', () => {
    const t = startFocus(pomo, 'hm', undefined, t0)
    expect(remainingMs(t, t0 + 10 * MIN)).toBe(15 * MIN)
    expect(isPhaseDone(t, t0 + 25 * MIN)).toBe(true)
    expect(remainingMs(t, t0 + 60 * MIN)).toBe(0)
  })

  it('Pausen verlängern das Ende und zählen nicht als Fokus', () => {
    let t = startFocus(pomo, 'hm', undefined, t0)
    t = pause(t, t0 + 5 * MIN)
    expect(isPaused(t)).toBe(true)
    expect(elapsedMs(t, t0 + 9 * MIN)).toBe(5 * MIN) // pausiert: Zeit steht
    t = resume(t, t0 + 10 * MIN)
    expect(isPaused(t)).toBe(false)
    expect(remainingMs(t, t0 + 10 * MIN)).toBe(20 * MIN)
    expect(phaseEndAt(t, t0 + 10 * MIN)).toBe(t0 + 30 * MIN)
    // doppeltes Pausieren/Fortsetzen ändert nichts
    expect(resume(t, t0 + 11 * MIN)).toBe(t)
  })

  it('schreibt eine abgeschlossene Session mit Ablenkungen fest', () => {
    let t = startFocus(pomo, 'hm', 'task1', t0)
    t = addDistraction(t, t0 + 3 * MIN)
    t = addDistraction(t, t0 + 7 * MIN)
    t = pause(t, t0 + 10 * MIN)
    t = resume(t, t0 + 12 * MIN)
    const rec = toSessionRecord(t, phaseEndAt(t, t0 + 40 * MIN), 'completed')
    expect(rec.focusMs).toBe(25 * MIN)
    expect(rec.endedAt).toBe(t0 + 27 * MIN)
    expect(rec.distractions).toHaveLength(2)
    expect(rec.day).toBe('2026-11-27')
    expect(rec.round).toBe(1)
  })

  it('zählt bei Abbruch nur die tatsächliche Fokuszeit', () => {
    let t = startFocus(pomo, 'hm', undefined, t0)
    t = pause(t, t0 + 8 * MIN) // offene Pause beim Abbruch
    const rec = toSessionRecord(t, t0 + 15 * MIN, 'aborted')
    expect(rec.focusMs).toBe(8 * MIN)
    expect(rec.pauses[0].end).toBe(t0 + 15 * MIN)
  })

  it('folgt dem Pomodoro-Rhythmus mit langer Pause nach Runde 4', () => {
    expect(breakAfter(pomo, 1)).toBe('shortBreak')
    expect(breakAfter(pomo, 4)).toBe('longBreak')
    expect(breakAfter(freeConfig(45), 1)).toBeNull()
    const f1 = startFocus(pomo, 'hm', undefined, t0)
    const b1 = nextPhase(f1, t0 + 25 * MIN)!
    expect(b1.phase).toBe('shortBreak')
    expect(b1.plannedMs).toBe(5 * MIN)
    expect(b1.distractions).toEqual([])
    const f2 = nextPhase(b1, t0 + 30 * MIN)!
    expect(f2.phase).toBe('focus')
    expect(f2.round).toBe(2)
    expect(f2.sessionId).not.toBe(f1.sessionId)
    expect(nextPhase({ ...f2, round: 4 }, t0)!.phase).toBe('longBreak')
    expect(nextPhase(startFocus(freeConfig(45), 'hm', undefined, t0), t0 + 45 * MIN)).toBeNull()
  })

  it('zählt Ablenkungen nur im Fokus', () => {
    const b = nextPhase(startFocus(pomo, 'hm', undefined, t0), t0 + 25 * MIN)!
    expect(addDistraction(b, t0 + 26 * MIN)).toBe(b)
  })
})

describe('Statistik', () => {
  const s = (day: string, min: number, subjectId = 'hm'): SessionRecord => ({
    id: day + min + subjectId,
    subjectId,
    mode: 'pomodoro',
    plannedMs: 25 * MIN,
    startedAt: 0,
    endedAt: 0,
    day,
    pauses: [],
    focusMs: min * MIN,
    status: 'completed',
    distractions: [],
  })

  it('summiert pro Tag und pro Fach', () => {
    const sessions = [s('2026-11-27', 25), s('2026-11-27', 25, 'tm'), s('2026-11-26', 50)]
    const days = totalsByDay(sessions)
    expect(days.get('2026-11-27')).toBe(50 * MIN)
    const subj = totalsBySubject(sessions, new Set(['2026-11-27']))
    expect(subj.get('hm')).toBe(25 * MIN)
    expect(subj.get('tm')).toBe(25 * MIN)
  })

  it('Serie: ≥ 30 min pro Tag, heute noch offen reißt die Serie nicht', () => {
    const totals = totalsByDay([
      s('2026-11-24', 30),
      s('2026-11-25', 25),
      s('2026-11-25', 10),
      s('2026-11-26', 45),
      s('2026-11-27', 20),
    ])
    expect(streak(totals, '2026-11-27', 30 * MIN)).toEqual({ days: 3, todayDone: false })
    totals.set('2026-11-27', 30 * MIN)
    expect(streak(totals, '2026-11-27', 30 * MIN)).toEqual({ days: 4, todayDone: true })
    expect(streak(totals, '2026-11-30', 30 * MIN).days).toBe(0)
  })
})

describe('Tageszeit und Begrüßung', () => {
  it('ordnet Uhrzeiten zu', () => {
    expect(daypartOf(new Date(2026, 10, 27, 6))).toBe('dawn')
    expect(daypartOf(new Date(2026, 10, 27, 9))).toBe('morning')
    expect(daypartOf(new Date(2026, 10, 27, 14))).toBe('afternoon')
    expect(daypartOf(new Date(2026, 10, 27, 19))).toBe('evening')
    expect(daypartOf(new Date(2026, 10, 27, 23))).toBe('night')
    expect(daypartOf(new Date(2026, 10, 27, 0, 30))).toBe('night')
    expect(daypartOf(new Date(2026, 10, 27, 2))).toBe('latenight')
  })

  it('setzt den Namen ein und ist pro Tag stabil', () => {
    const a = greeting('night', 'Julius', '2026-11-27')
    expect(a).toContain('Julius')
    expect(greeting('night', 'Julius', '2026-11-27')).toBe(a)
    expect(greeting('evening', '', '2026-11-27')).not.toMatch(/\{name\}|,\s*[?.]/)
  })
})
