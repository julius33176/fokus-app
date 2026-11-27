// Export/Import als JSON (PLAN.md, Abschnitt 3).
import { getDb, SCHEMA_VERSION } from './db.ts'
import { DEFAULT_SETTINGS } from './repo.ts'
import { STORE_NAMES, type KvMap, type Settings, type StoreMap, type StoreName } from './types.ts'

export interface BackupFile {
  app: 'fokus'
  schemaVersion: number
  exportedAt: string
  data: { [S in StoreName]: StoreMap[S][] } & { kv: { settings: Settings; meta: KvMap['meta'] | null } }
}

export async function exportBackup(now = new Date()): Promise<BackupFile> {
  const db = await getDb()
  const tx = db.transaction([...STORE_NAMES, 'kv'], 'readonly')
  const entries = await Promise.all(STORE_NAMES.map(async (s) => [s, await tx.objectStore(s).getAll()] as const))
  const settings = ((await tx.objectStore('kv').get('settings')) as Settings | undefined) ?? DEFAULT_SETTINGS
  const meta = ((await tx.objectStore('kv').get('meta')) as KvMap['meta'] | undefined) ?? null
  await tx.done
  return {
    app: 'fokus',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: { ...(Object.fromEntries(entries) as BackupFile['data']), kv: { settings, meta } },
  }
}

export function backupFileName(now = new Date()): string {
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `fokus-backup-${d}.json`
}

export interface BackupSummary {
  exportedAt: string
  subjects: number
  tasks: number
  sessions: number
  gateEvents: number
}

export type ParseResult = { ok: true; backup: BackupFile; summary: BackupSummary } | { ok: false; error: string }

function isRecordArray(v: unknown): v is { id: unknown }[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'object' && x !== null && typeof (x as { id?: unknown }).id === 'string')
}

/** Prüft eine Sicherungsdatei, bevor irgendetwas überschrieben wird. */
export function parseBackup(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Die Datei ist kein gültiges JSON.' }
  }
  const b = raw as Partial<BackupFile>
  if (!b || b.app !== 'fokus') return { ok: false, error: 'Das ist keine Fokus-Sicherung.' }
  if (typeof b.schemaVersion !== 'number' || b.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, error: 'Die Sicherung stammt aus einer neueren App-Version. Bitte erst die App aktualisieren.' }
  }
  if (!b.data || typeof b.data !== 'object') return { ok: false, error: 'Die Sicherung enthält keine Daten.' }
  for (const s of STORE_NAMES) {
    const v = (b.data as Record<string, unknown>)[s]
    if (v !== undefined && !isRecordArray(v)) return { ok: false, error: `Der Bereich „${s}“ ist beschädigt.` }
  }
  const data = b.data as BackupFile['data']
  const backup: BackupFile = {
    app: 'fokus',
    schemaVersion: b.schemaVersion,
    exportedAt: typeof b.exportedAt === 'string' ? b.exportedAt : '',
    data: {
      ...(Object.fromEntries(STORE_NAMES.map((s) => [s, data[s] ?? []])) as BackupFile['data']),
      kv: { settings: { ...DEFAULT_SETTINGS, ...(data.kv?.settings ?? {}) }, meta: data.kv?.meta ?? null },
    },
  }
  // Spätere Schema-Versionen: hier ältere Sicherungen durch dieselben Migrationen schicken.
  return {
    ok: true,
    backup,
    summary: {
      exportedAt: backup.exportedAt,
      subjects: backup.data.subjects.length,
      tasks: backup.data.tasks.length,
      sessions: backup.data.sessions.length,
      gateEvents: backup.data.gateEvents.length,
    },
  }
}

/** Ersetzt alle Daten durch die Sicherung – in einer einzigen Transaktion (ganz oder gar nicht). */
export async function importBackup(backup: BackupFile, now = Date.now()): Promise<void> {
  const db = await getDb()
  const tx = db.transaction([...STORE_NAMES, 'kv'], 'readwrite')
  const ops: Promise<unknown>[] = []
  for (const s of STORE_NAMES) {
    const store = tx.objectStore(s)
    ops.push(store.clear())
    for (const item of backup.data[s]) ops.push(store.put(item as never))
  }
  const kv = tx.objectStore('kv')
  ops.push(kv.put(backup.data.kv.settings, 'settings'))
  ops.push(kv.put(backup.data.kv.meta ?? { schemaVersion: SCHEMA_VERSION, createdAt: now }, 'meta'))
  ops.push(kv.put(null, 'activeTimer'))
  await Promise.all(ops)
  await tx.done
}
