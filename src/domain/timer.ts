// Zustandsautomat für Fokus-Sessions. Reine Funktionen, alles aus Zeitstempeln berechnet
// (JavaScript schläft im Hintergrund, setInterval wäre unzuverlässig).

import { dayKey } from './dates.ts'

export type Phase = 'focus' | 'shortBreak' | 'longBreak'
export type TimerMode = 'free' | 'pomodoro'

export interface PomodoroPreset {
  id: string
  name: string
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  roundsUntilLong: number
}

export interface TimerConfig {
  mode: TimerMode
  presetId?: string
  focusMin: number
  shortBreakMin: number
  longBreakMin: number
  roundsUntilLong: number
}

export interface Pause {
  start: number
  end?: number
}

/** Zustand der laufenden Phase. Wird bei jeder Änderung in IndexedDB gesichert. */
export interface ActiveTimer {
  sessionId: string
  subjectId: string
  taskId?: string
  config: TimerConfig
  phase: Phase
  round: number
  phaseStartedAt: number
  plannedMs: number
  pauses: Pause[]
  distractions: number[]
}

export interface SessionRecord {
  id: string
  subjectId: string
  taskId?: string
  mode: TimerMode
  presetId?: string
  round?: number
  plannedMs: number
  startedAt: number
  endedAt: number
  day: string
  pauses: { start: number; end: number }[]
  focusMs: number
  status: 'completed' | 'aborted'
  distractions: number[]
  rating?: 1 | 2 | 3 | 4 | 5
  note?: string
}

const MIN = 60_000

export function newId(): string {
  return crypto.randomUUID()
}

export function configFromPreset(p: PomodoroPreset): TimerConfig {
  return {
    mode: 'pomodoro',
    presetId: p.id,
    focusMin: p.focusMin,
    shortBreakMin: p.shortBreakMin,
    longBreakMin: p.longBreakMin,
    roundsUntilLong: p.roundsUntilLong,
  }
}

export function freeConfig(focusMin: number): TimerConfig {
  return { mode: 'free', focusMin, shortBreakMin: 0, longBreakMin: 0, roundsUntilLong: 0 }
}

export function startFocus(
  config: TimerConfig,
  subjectId: string,
  taskId: string | undefined,
  now: number,
  round = 1,
): ActiveTimer {
  return {
    sessionId: newId(),
    subjectId,
    taskId,
    config,
    phase: 'focus',
    round,
    phaseStartedAt: now,
    plannedMs: config.focusMin * MIN,
    pauses: [],
    distractions: [],
  }
}

export function isPaused(t: ActiveTimer): boolean {
  const last = t.pauses[t.pauses.length - 1]
  return !!last && last.end === undefined
}

export function pausedMs(t: ActiveTimer, now: number): number {
  return t.pauses.reduce((sum, p) => sum + ((p.end ?? now) - p.start), 0)
}

export function elapsedMs(t: ActiveTimer, now: number): number {
  return Math.max(0, now - t.phaseStartedAt - pausedMs(t, now))
}

export function remainingMs(t: ActiveTimer, now: number): number {
  return Math.max(0, t.plannedMs - elapsedMs(t, now))
}

export function progress(t: ActiveTimer, now: number): number {
  return t.plannedMs > 0 ? Math.min(1, elapsedMs(t, now) / t.plannedMs) : 1
}

export function isPhaseDone(t: ActiveTimer, now: number): boolean {
  return remainingMs(t, now) <= 0
}

/** Zeitpunkt, an dem die Phase endet bzw. geendet hat (berücksichtigt Pausen). */
export function phaseEndAt(t: ActiveTimer, now: number): number {
  return t.phaseStartedAt + t.plannedMs + pausedMs(t, now)
}

export function pause(t: ActiveTimer, now: number): ActiveTimer {
  if (isPaused(t) || isPhaseDone(t, now)) return t
  return { ...t, pauses: [...t.pauses, { start: now }] }
}

export function resume(t: ActiveTimer, now: number): ActiveTimer {
  if (!isPaused(t)) return t
  const pauses = t.pauses.slice()
  pauses[pauses.length - 1] = { ...pauses[pauses.length - 1], end: now }
  return { ...t, pauses }
}

export function addDistraction(t: ActiveTimer, now: number): ActiveTimer {
  if (t.phase !== 'focus') return t
  return { ...t, distractions: [...t.distractions, now] }
}

/** Fokus-Phase als Session festschreiben. endAt = tatsächliches Ende (bei Abschluss: berechnetes Ende). */
export function toSessionRecord(
  t: ActiveTimer,
  endAt: number,
  status: SessionRecord['status'],
  dayStartHour?: number,
): SessionRecord {
  const closed = t.pauses.map((p) => ({ start: p.start, end: p.end ?? endAt }))
  const paused = closed.reduce((s, p) => s + (p.end - p.start), 0)
  const focusMs = Math.min(t.plannedMs, Math.max(0, endAt - t.phaseStartedAt - paused))
  return {
    id: t.sessionId,
    subjectId: t.subjectId,
    taskId: t.taskId,
    mode: t.config.mode,
    presetId: t.config.presetId,
    round: t.config.mode === 'pomodoro' ? t.round : undefined,
    plannedMs: t.plannedMs,
    startedAt: t.phaseStartedAt,
    endedAt: endAt,
    day: dayKey(t.phaseStartedAt, dayStartHour),
    pauses: closed,
    focusMs,
    status,
    distractions: t.distractions,
  }
}

/** Welche Pause folgt auf Fokus-Runde `round`? */
export function breakAfter(config: TimerConfig, round: number): Phase | null {
  if (config.mode !== 'pomodoro') return null
  return config.roundsUntilLong > 0 && round % config.roundsUntilLong === 0 ? 'longBreak' : 'shortBreak'
}

/** Nächste Phase starten (Pause nach Fokus, Fokus nach Pause). null = Session-Folge zu Ende. */
export function nextPhase(t: ActiveTimer, startAt: number): ActiveTimer | null {
  if (t.phase === 'focus') {
    const br = breakAfter(t.config, t.round)
    if (!br) return null
    const min = br === 'longBreak' ? t.config.longBreakMin : t.config.shortBreakMin
    return {
      ...t,
      phase: br,
      phaseStartedAt: startAt,
      plannedMs: min * MIN,
      pauses: [],
      distractions: [],
    }
  }
  return startFocus(t.config, t.subjectId, t.taskId, startAt, t.round + 1)
}
