// Tageslogik. Ein "Tag" beginnt um dayStartHour (Standard 04:00, Julius' Wunsch):
// Lernen um 01:30 zählt noch zum Vortag.

export const DEFAULT_DAY_START_HOUR = 4

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function keyOf(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Lokaler Tagesschlüssel YYYY-MM-DD unter Berücksichtigung der Tagesgrenze. */
export function dayKey(ts: number, dayStartHour = DEFAULT_DAY_START_HOUR): string {
  const d = new Date(ts)
  if (d.getHours() < dayStartHour) d.setDate(d.getDate() - 1)
  return keyOf(d)
}

/** Datum (lokale Mitternacht) zu einem Tagesschlüssel. */
export function dateOfKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, days: number): string {
  const d = dateOfKey(key)
  d.setDate(d.getDate() + days)
  return keyOf(d)
}

/** Die 7 Tagesschlüssel der Woche (Mo–So), in der `key` liegt. */
export function weekKeys(key: string): string[] {
  const d = dateOfKey(key)
  const mondayOffset = (d.getDay() + 6) % 7 // Mo = 0
  const monday = keyOf(new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayOffset))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Index 0–6 (Mo–So) eines Tagesschlüssels. */
export function weekdayIndex(key: string): number {
  return (dateOfKey(key).getDay() + 6) % 7
}

/** ISO-Kalenderwoche. */
export function isoWeek(key: string): number {
  const d = dateOfKey(key)
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const firstThursday = new Date(target.getFullYear(), 0, 4)
  const diff = (target.getTime() - firstThursday.getTime()) / 86_400_000
  return 1 + Math.round((diff - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
}

export const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export function formatDayLong(key: string): string {
  return dateOfKey(key).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
}
