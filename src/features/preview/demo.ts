// Statische Beispieldaten für die Design-Vorschau (Phase 1). Keine echte Datenhaltung.

export type Mode = 'fokus' | 'morgen' | 'abend'
export type Screen = 'start' | 'timer'
export type DesignId = 'aurora' | 'instrument' | 'ruhe'

export const DESIGNS: { id: DesignId; name: string; idea: string }[] = [
  { id: 'aurora', name: 'Aurora', idea: 'Atmosphäre, Glas, leuchtender Ring' },
  { id: 'instrument', name: 'Instrument', idea: 'Präzise Skala, Messwerte, Monospace' },
  { id: 'ruhe', name: 'Ruhe', idea: 'Typografie, Serifen, matter Ring' },
]

export const MODES: { id: Mode; name: string }[] = [
  { id: 'fokus', name: 'Fokus' },
  { id: 'morgen', name: 'Morgen' },
  { id: 'abend', name: 'Abend' },
]

export const MODE_COPY: Record<Mode, { greeting: string; line: string }> = {
  fokus: { greeting: 'Bereit', line: 'Eine Runde HM, dann Pause.' },
  morgen: { greeting: 'Guten Morgen', line: 'Kein Social Media bis 10:00.' },
  abend: { greeting: 'Guten Abend', line: 'Zeit für den Tagesrückblick.' },
}

export interface Subject {
  id: string
  name: string
  long: string
}

export const SUBJECTS: Subject[] = [
  { id: 'hm', name: 'HM', long: 'Höhere Mathematik' },
  { id: 'tm', name: 'TM', long: 'Technische Mechanik' },
  { id: 'prog', name: 'Prog', long: 'Programmieren' },
]

export const PRESETS = [
  { id: 'pomo', name: '25 / 5', detail: 'Pomodoro' },
  { id: 'deep', name: '50 / 10', detail: 'Tiefe Arbeit' },
  { id: 'free', name: 'Frei', detail: 'Eigene Dauer' },
]

export const TODAY = {
  dateLabel: new Date(2026, 10, 27).toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }),
  focusMin: 105, // 1 h 45 min
  sessions: 3,
  weekMin: 390, // 6,5 h
  weekGoalMin: 600, // 10 h
  streakDays: 12,
  // Lernminuten Mo–So dieser Woche (Fr = heute)
  week: [70, 95, 0, 120, 105, 0, 0],
}

export const GATE_TODAY = [
  { id: 'instagram', name: 'Instagram', used: 2, limit: 5 },
  { id: 'tiktok', name: 'TikTok', used: 0, limit: 3 },
  { id: 'youtube', name: 'YouTube', used: 1, limit: 4 },
]

export const SESSION = {
  subject: SUBJECTS[0],
  task: 'Übungsblatt 5',
  plannedMin: 25,
  round: 2,
  rounds: 4,
}

export function formatHM(min: number): { h: string; m: string } {
  return { h: String(Math.floor(min / 60)), m: String(min % 60).padStart(2, '0') }
}

export function formatHours(min: number): string {
  return (min / 60).toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

export function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
