// Statistik aus Session-Datensätzen. Reine Funktionen.

import { addDays } from './dates.ts'
import type { SessionRecord } from './timer.ts'

export type DayTotals = Map<string, number> // dayKey → Fokus-ms

export function totalsByDay(sessions: SessionRecord[]): DayTotals {
  const map: DayTotals = new Map()
  for (const s of sessions) map.set(s.day, (map.get(s.day) ?? 0) + s.focusMs)
  return map
}

export function sumDays(totals: DayTotals, keys: string[]): number {
  return keys.reduce((sum, k) => sum + (totals.get(k) ?? 0), 0)
}

export function totalsBySubject(sessions: SessionRecord[], days?: Set<string>): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) {
    if (days && !days.has(s.day)) continue
    map.set(s.subjectId, (map.get(s.subjectId) ?? 0) + s.focusMs)
  }
  return map
}

/**
 * Serie: aufeinanderfolgende Tage mit mindestens `thresholdMs` Fokuszeit.
 * Ist heute das Ziel noch nicht erreicht, läuft die Serie ab gestern weiter (sie ist noch nicht gerissen).
 */
export function streak(totals: DayTotals, todayKey: string, thresholdMs: number): { days: number; todayDone: boolean } {
  const todayDone = (totals.get(todayKey) ?? 0) >= thresholdMs
  let key = todayDone ? todayKey : addDays(todayKey, -1)
  let days = 0
  while ((totals.get(key) ?? 0) >= thresholdMs) {
    days++
    key = addDays(key, -1)
  }
  return { days, todayDone }
}

export function averageDistractions(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0
  return sessions.reduce((s, x) => s + x.distractions.length, 0) / sessions.length
}

export function formatDuration(ms: number): { h: number; m: number } {
  const totalMin = Math.round(ms / 60_000)
  return { h: Math.floor(totalMin / 60), m: totalMin % 60 }
}

export function formatHoursDecimal(ms: number): string {
  return (ms / 3_600_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

export function formatDurationText(ms: number): string {
  const { h, m } = formatDuration(ms)
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
