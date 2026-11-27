import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { GateEvent, KvMap, Routine, RoutineRun, SessionRecord, StoreMap, Subject, Task } from './types.ts'

export const DB_NAME = 'fokus'
export const SCHEMA_VERSION = 1

interface FokusDB extends DBSchema {
  subjects: { key: string; value: Subject }
  tasks: { key: string; value: Task; indexes: { subjectId: string } }
  sessions: { key: string; value: SessionRecord; indexes: { day: string; subjectId: string; startedAt: number } }
  apps: { key: string; value: StoreMap['apps'] }
  gateEvents: { key: string; value: GateEvent; indexes: { day: string; appId: string; appDay: [string, string] } }
  routines: { key: string; value: Routine }
  routineRuns: { key: string; value: RoutineRun; indexes: { day: string } }
  alternatives: { key: string; value: StoreMap['alternatives'] }
  kv: { key: string; value: KvMap[keyof KvMap] }
}

export type FokusDb = IDBPDatabase<FokusDB>

let dbPromise: Promise<FokusDb> | null = null

/**
 * Öffnet die Datenbank. Neue Schema-Versionen bekommen hier einen eigenen `if (oldVersion < N)`-Block,
 * damit bestehende Daten erhalten bleiben (Migration).
 */
export function getDb(): Promise<FokusDb> {
  if (!dbPromise) {
    dbPromise = openDB<FokusDB>(DB_NAME, SCHEMA_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('subjects', { keyPath: 'id' })
          const tasks = db.createObjectStore('tasks', { keyPath: 'id' })
          tasks.createIndex('subjectId', 'subjectId')
          const sessions = db.createObjectStore('sessions', { keyPath: 'id' })
          sessions.createIndex('day', 'day')
          sessions.createIndex('subjectId', 'subjectId')
          sessions.createIndex('startedAt', 'startedAt')
          db.createObjectStore('apps', { keyPath: 'id' })
          const gate = db.createObjectStore('gateEvents', { keyPath: 'id' })
          gate.createIndex('day', 'day')
          gate.createIndex('appId', 'appId')
          gate.createIndex('appDay', ['appId', 'day'])
          db.createObjectStore('routines', { keyPath: 'id' })
          const runs = db.createObjectStore('routineRuns', { keyPath: 'id' })
          runs.createIndex('day', 'day')
          db.createObjectStore('alternatives', { keyPath: 'id' })
          db.createObjectStore('kv')
        }
      },
      blocking() {
        // Eine neuere Version (anderer Tab) will upgraden: Verbindung freigeben
        void dbPromise?.then((db) => db.close())
        dbPromise = null
      },
    })
  }
  return dbPromise
}

/** Nur für Tests: Verbindung schließen und vergessen. */
export async function resetDbConnection(): Promise<void> {
  if (dbPromise) {
    const db = await dbPromise
    db.close()
  }
  dbPromise = null
}
