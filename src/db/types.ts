// Datenmodell laut PLAN.md, Abschnitt 3.
import type { ActiveTimer, PomodoroPreset, SessionRecord } from '../domain/timer.ts'

export type { ActiveTimer, PomodoroPreset, SessionRecord }

export interface Subject {
  id: string
  name: string
  color: string
  order: number
  archived: boolean
  createdAt: number
}

export interface Task {
  id: string
  subjectId: string
  title: string
  done: boolean
  createdAt: number
  doneAt?: number
}

export interface GatedApp {
  id: string
  name: string
  openScheme: string
  dailyOpenLimit: number
  passMinutes: number
  screenTimeHint?: string
  enabled: boolean
  order: number
  createdAt: number
}

export interface GateEvent {
  id: string
  appId: string
  ts: number
  day: string
  type: 'opened' | 'cancelled' | 'blocked' | 'override'
  intention?: string
  reason?: string
  alternativeId?: string
}

export interface RoutineItem {
  id: string
  label: string
  kind: 'check' | 'dayGoal' | 'startSession' | 'focusOn' | 'reflection'
}

export interface Routine {
  id: 'morning' | 'evening'
  items: RoutineItem[]
  reminderTime: string
  noSocialUntil?: string
}

export interface RoutineRun {
  id: string
  routineId: 'morning' | 'evening'
  day: string
  startedAt: number
  finishedAt?: number
  checked: string[]
  dayGoal?: string
  reflection?: string
}

export interface Alternative {
  id: string
  text: string
  enabled: boolean
  order: number
}

export interface Settings {
  name: string
  weeklyGoalMin: number
  streakMinPerDay: number
  dayStartHour: number
  presets: PomodoroPreset[]
  defaultPresetId: string
  freeDefaultMin: number
  lastSubjectId?: string
  keepScreenOn: boolean
}

export interface KvMap {
  settings: Settings
  activeTimer: ActiveTimer | null
  meta: { schemaVersion: number; createdAt: number }
}

export interface StoreMap {
  subjects: Subject
  tasks: Task
  sessions: SessionRecord
  apps: GatedApp
  gateEvents: GateEvent
  routines: Routine
  routineRuns: RoutineRun
  alternatives: Alternative
}

export type StoreName = keyof StoreMap
export const STORE_NAMES: StoreName[] = [
  'subjects',
  'tasks',
  'sessions',
  'apps',
  'gateEvents',
  'routines',
  'routineRuns',
  'alternatives',
]
