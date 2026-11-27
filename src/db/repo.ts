import type { ActiveTimer } from '../domain/timer.ts'
import { getDb, SCHEMA_VERSION } from './db.ts'
import { STORE_NAMES, type KvMap, type Settings, type StoreMap, type StoreName, type Subject } from './types.ts'

// ---------- Allgemeine Zugriffe ----------

export async function getAll<S extends StoreName>(store: S): Promise<StoreMap[S][]> {
  const db = await getDb()
  return (await db.getAll(store)) as StoreMap[S][]
}

export async function getOne<S extends StoreName>(store: S, id: string): Promise<StoreMap[S] | undefined> {
  const db = await getDb()
  return (await db.get(store, id)) as StoreMap[S] | undefined
}

export async function put<S extends StoreName>(store: S, value: StoreMap[S]): Promise<void> {
  const db = await getDb()
  // Die Typen der einzelnen Stores sind in db.ts festgelegt; hier generisch durchgereicht.
  await db.put(store, value as never)
}

export async function remove(store: StoreName, id: string): Promise<void> {
  const db = await getDb()
  await db.delete(store, id)
}

// ---------- Gezielte Abfragen ----------

/** Sessions mit Tagesschlüssel zwischen from und to (inklusive, YYYY-MM-DD sortiert lexikografisch). */
export async function sessionsBetween(fromDay: string, toDay: string): Promise<StoreMap['sessions'][]> {
  const db = await getDb()
  return db.getAllFromIndex('sessions', 'day', IDBKeyRange.bound(fromDay, toDay))
}

export async function tasksOfSubject(subjectId: string): Promise<StoreMap['tasks'][]> {
  const db = await getDb()
  return db.getAllFromIndex('tasks', 'subjectId', subjectId)
}

export async function deleteSubjectCascade(subjectId: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['subjects', 'tasks'], 'readwrite')
  const tasks = await tx.objectStore('tasks').index('subjectId').getAllKeys(subjectId)
  await Promise.all([...tasks.map((k) => tx.objectStore('tasks').delete(k)), tx.objectStore('subjects').delete(subjectId)])
  await tx.done
}

// ---------- Schlüssel-Wert ----------

async function getKv<K extends keyof KvMap>(key: K): Promise<KvMap[K] | undefined> {
  const db = await getDb()
  return (await db.get('kv', key)) as KvMap[K] | undefined
}

async function setKv<K extends keyof KvMap>(key: K, value: KvMap[K]): Promise<void> {
  const db = await getDb()
  await db.put('kv', value, key)
}

export const DEFAULT_SETTINGS: Settings = {
  name: 'Julius',
  weeklyGoalMin: 600,
  streakMinPerDay: 30,
  dayStartHour: 4,
  presets: [
    { id: 'pomo', name: '25 / 5', focusMin: 25, shortBreakMin: 5, longBreakMin: 15, roundsUntilLong: 4 },
    { id: 'deep', name: '50 / 10', focusMin: 50, shortBreakMin: 10, longBreakMin: 20, roundsUntilLong: 2 },
  ],
  defaultPresetId: 'pomo',
  freeDefaultMin: 45,
  keepScreenOn: true,
}

/** Einstellungen, ergänzt um Standardwerte (neue Felder späterer Versionen brauchen keine Migration). */
export async function getSettings(): Promise<Settings> {
  const stored = await getKv('settings')
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch }
  await setKv('settings', next)
  return next
}

export async function getActiveTimer(): Promise<ActiveTimer | null> {
  return (await getKv('activeTimer')) ?? null
}

export async function setActiveTimer(t: ActiveTimer | null): Promise<void> {
  await setKv('activeTimer', t)
}

// ---------- Erster Start ----------

export const SUBJECT_COLORS = ['#8fd3ff', '#ffc684', '#a8e6b8', '#d6a8ff', '#ff9f9f', '#ffe27a', '#7ae0e0', '#ffb0d9']

const DEFAULT_SUBJECTS: Pick<Subject, 'name' | 'color'>[] = [
  { name: 'Höhere Mathematik', color: SUBJECT_COLORS[0] },
  { name: 'Technische Mechanik', color: SUBJECT_COLORS[1] },
  { name: 'Programmieren', color: SUBJECT_COLORS[2] },
]

/** Legt beim allerersten Start Grunddaten an. Mehrfach aufrufbar. */
export async function ensureInitialized(now = Date.now()): Promise<void> {
  const meta = await getKv('meta')
  if (meta) return
  const db = await getDb()
  const tx = db.transaction(['subjects', 'kv'], 'readwrite')
  DEFAULT_SUBJECTS.forEach((s, i) =>
    tx.objectStore('subjects').put({ id: crypto.randomUUID(), name: s.name, color: s.color, order: i, archived: false, createdAt: now }),
  )
  tx.objectStore('kv').put({ schemaVersion: SCHEMA_VERSION, createdAt: now }, 'meta')
  await tx.done
}

export { STORE_NAMES }
