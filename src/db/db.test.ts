import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it } from 'vitest'
import { startFocus, freeConfig, toSessionRecord } from '../domain/timer.ts'
import { exportBackup, importBackup, parseBackup } from './backup.ts'
import { resetDbConnection } from './db.ts'
import {
  deleteSubjectCascade,
  ensureInitialized,
  getActiveTimer,
  getAll,
  getSettings,
  put,
  saveSettings,
  sessionsBetween,
  setActiveTimer,
  tasksOfSubject,
} from './repo.ts'

beforeEach(async () => {
  await resetDbConnection()
  globalThis.indexedDB = new IDBFactory()
})

const MIN = 60_000

describe('Datenbank', () => {
  it('legt beim ersten Start drei Fächer an, aber nur einmal', async () => {
    await ensureInitialized()
    await ensureInitialized()
    const subjects = await getAll('subjects')
    expect(subjects.map((s) => s.name).sort()).toEqual(['Höhere Mathematik', 'Programmieren', 'Technische Mechanik'])
  })

  it('ergänzt Einstellungen um Standardwerte und speichert Änderungen', async () => {
    expect((await getSettings()).streakMinPerDay).toBe(30)
    await saveSettings({ name: 'J', weeklyGoalMin: 480 })
    const s = await getSettings()
    expect(s.name).toBe('J')
    expect(s.weeklyGoalMin).toBe(480)
    expect(s.dayStartHour).toBe(4)
  })

  it('sichert den laufenden Timer und fragt Sessions nach Tagen ab', async () => {
    const t = startFocus(freeConfig(30), 'hm', undefined, new Date(2026, 10, 27, 10).getTime())
    await setActiveTimer(t)
    expect((await getActiveTimer())?.sessionId).toBe(t.sessionId)
    await setActiveTimer(null)
    expect(await getActiveTimer()).toBeNull()

    for (const [d, h] of [
      [25, 10],
      [26, 10],
      [27, 2], // zählt zum 26.
      [27, 10],
    ]) {
      const s = startFocus(freeConfig(30), 'hm', undefined, new Date(2026, 10, d, h).getTime())
      await put('sessions', toSessionRecord(s, s.phaseStartedAt + 30 * MIN, 'completed'))
    }
    const inRange = await sessionsBetween('2026-11-26', '2026-11-27')
    expect(inRange.map((s) => s.day).sort()).toEqual(['2026-11-26', '2026-11-26', '2026-11-27'])
  })

  it('löscht ein Fach samt Aufgaben', async () => {
    await put('subjects', { id: 'x', name: 'X', color: '#fff', order: 0, archived: false, createdAt: 0 })
    await put('tasks', { id: 't1', subjectId: 'x', title: 'A', done: false, createdAt: 0 })
    await put('tasks', { id: 't2', subjectId: 'y', title: 'B', done: false, createdAt: 0 })
    await deleteSubjectCascade('x')
    expect(await tasksOfSubject('x')).toEqual([])
    expect((await getAll('tasks')).map((t) => t.id)).toEqual(['t2'])
  })
})

describe('Export und Import', () => {
  it('übersteht einen vollständigen Rundlauf', async () => {
    await ensureInitialized()
    await saveSettings({ weeklyGoalMin: 720 })
    const [hm] = await getAll('subjects')
    const s = startFocus(freeConfig(25), hm.id, undefined, Date.now())
    await put('sessions', { ...toSessionRecord(s, s.phaseStartedAt + 25 * MIN, 'completed'), rating: 4, note: 'gut' })
    const backup = await exportBackup()
    const text = JSON.stringify(backup)

    // Neue, leere Datenbank (z. B. neues iPhone)
    await resetDbConnection()
    globalThis.indexedDB = new IDBFactory()
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.summary.sessions).toBe(1)
    await importBackup(parsed.backup)

    expect((await getSettings()).weeklyGoalMin).toBe(720)
    const sessions = await getAll('sessions')
    expect(sessions[0].rating).toBe(4)
    expect(sessions[0].note).toBe('gut')
    expect((await getAll('subjects')).length).toBe(3)
    expect(await getActiveTimer()).toBeNull()
    // Nach Import kein erneutes Anlegen der Standardfächer
    await ensureInitialized()
    expect((await getAll('subjects')).length).toBe(3)
  })

  it('lehnt fremde, beschädigte oder zu neue Dateien ab', () => {
    expect(parseBackup('kein json')).toMatchObject({ ok: false })
    expect(parseBackup(JSON.stringify({ app: 'andere' }))).toMatchObject({ ok: false })
    expect(parseBackup(JSON.stringify({ app: 'fokus', schemaVersion: 99, data: {} }))).toMatchObject({ ok: false })
    expect(parseBackup(JSON.stringify({ app: 'fokus', schemaVersion: 1, data: { sessions: [{ foo: 1 }] } }))).toMatchObject({
      ok: false,
    })
  })

  it('ersetzt beim Import vorhandene Daten vollständig', async () => {
    await put('subjects', { id: 'alt', name: 'Alt', color: '#fff', order: 0, archived: false, createdAt: 0 })
    const parsed = parseBackup(JSON.stringify({ app: 'fokus', schemaVersion: 1, exportedAt: '', data: { subjects: [] } }))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) await importBackup(parsed.backup)
    expect(await getAll('subjects')).toEqual([])
  })
})
