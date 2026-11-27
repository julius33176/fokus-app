// Zentraler App-Zustand: einmal aus IndexedDB laden, Änderungen erst speichern, dann anzeigen.
// Kleine Datenmengen (ein Student, einige tausend Sessions) → alles im Speicher, Statistik live gerechnet.

import { useSyncExternalStore } from 'react'
import { getDb } from '../db/db.ts'
import * as repo from '../db/repo.ts'
import type { Settings, Subject, Task } from '../db/types.ts'
import type { ActiveTimer, SessionRecord } from '../domain/timer.ts'

export interface AppState {
  ready: boolean
  error: string | null
  settings: Settings
  subjects: Subject[]
  tasks: Task[]
  sessions: SessionRecord[]
  activeTimer: ActiveTimer | null
  /** Session, die gerade bewertet werden soll (Bewertungs-Blatt offen). */
  ratingSessionId: string | null
}

let state: AppState = {
  ready: false,
  error: null,
  settings: repo.DEFAULT_SETTINGS,
  subjects: [],
  tasks: [],
  sessions: [],
  activeTimer: null,
  ratingSessionId: null,
}

const listeners = new Set<() => void>()

function set(patch: Partial<AppState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function getState(): AppState {
  return state
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

const byOrder = (a: Subject, b: Subject) => a.order - b.order || a.createdAt - b.createdAt

export const actions = {
  async init() {
    try {
      await repo.ensureInitialized()
      const [settings, subjects, tasks, sessions, activeTimer] = await Promise.all([
        repo.getSettings(),
        repo.getAll('subjects'),
        repo.getAll('tasks'),
        repo.getAll('sessions'),
        repo.getActiveTimer(),
      ])
      set({ ready: true, settings, subjects: subjects.sort(byOrder), tasks, sessions, activeTimer })
      // Speicher dauerhaft anfragen, damit iOS die Daten nicht bei Platzmangel räumt
      void navigator.storage?.persist?.()
    } catch (e) {
      set({ ready: true, error: e instanceof Error ? e.message : String(e) })
    }
  },

  /** Nach einem Import alles neu laden. */
  async reload() {
    await getDb()
    await actions.init()
  },

  async saveSettings(patch: Partial<Settings>) {
    const settings = await repo.saveSettings(patch)
    set({ settings })
  },

  // ---------- Fächer ----------
  async addSubject(name: string, color: string) {
    const subject: Subject = {
      id: crypto.randomUUID(),
      name: name.trim(),
      color,
      order: Math.max(-1, ...state.subjects.map((s) => s.order)) + 1,
      archived: false,
      createdAt: Date.now(),
    }
    await repo.put('subjects', subject)
    set({ subjects: [...state.subjects, subject].sort(byOrder) })
    return subject
  },

  async updateSubject(subject: Subject) {
    await repo.put('subjects', subject)
    set({ subjects: state.subjects.map((s) => (s.id === subject.id ? subject : s)).sort(byOrder) })
  },

  async deleteSubject(id: string) {
    await repo.deleteSubjectCascade(id)
    set({ subjects: state.subjects.filter((s) => s.id !== id), tasks: state.tasks.filter((t) => t.subjectId !== id) })
  },

  // ---------- Aufgaben ----------
  async addTask(subjectId: string, title: string) {
    const task: Task = { id: crypto.randomUUID(), subjectId, title: title.trim(), done: false, createdAt: Date.now() }
    await repo.put('tasks', task)
    set({ tasks: [...state.tasks, task] })
    return task
  },

  async updateTask(task: Task) {
    await repo.put('tasks', task)
    set({ tasks: state.tasks.map((t) => (t.id === task.id ? task : t)) })
  },

  async deleteTask(id: string) {
    await repo.remove('tasks', id)
    set({ tasks: state.tasks.filter((t) => t.id !== id) })
  },

  // ---------- Timer und Sessions ----------
  async setActiveTimer(t: ActiveTimer | null) {
    set({ activeTimer: t })
    await repo.setActiveTimer(t)
  },

  async saveSession(rec: SessionRecord) {
    await repo.put('sessions', rec)
    const exists = state.sessions.some((s) => s.id === rec.id)
    set({ sessions: exists ? state.sessions.map((s) => (s.id === rec.id ? rec : s)) : [...state.sessions, rec] })
  },

  async deleteSession(id: string) {
    await repo.remove('sessions', id)
    set({ sessions: state.sessions.filter((s) => s.id !== id) })
  },

  openRating(sessionId: string | null) {
    set({ ratingSessionId: sessionId })
  },
}
