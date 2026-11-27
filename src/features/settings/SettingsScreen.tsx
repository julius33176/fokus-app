import { useEffect, useRef, useState } from 'react'
import { actions, getState, useAppState } from '../../app/store.ts'
import { backupFileName, exportBackup, importBackup, parseBackup, type BackupFile, type BackupSummary } from '../../db/backup.ts'
import type { PomodoroPreset } from '../../db/types.ts'
import { routeUrl } from '../../router/router.ts'
import { Sheet, Stepper, Toast } from '../../ui/components.tsx'
import './settings.css'

async function shareOrDownload(): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const backup = await exportBackup()
  const json = JSON.stringify(backup, null, 2)
  const name = backupFileName()
  const file = new File([json], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Fokus-Sicherung' })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

export function SettingsScreen() {
  const { settings } = useAppState()
  const [name, setName] = useState(settings.name)
  const [toast, setToast] = useState<string | null>(null)
  const [pending, setPending] = useState<{ backup: BackupFile; summary: BackupSummary } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const updatePreset = (id: string, patch: Partial<PomodoroPreset>) =>
    actions.saveSettings({
      presets: settings.presets.map((p) => {
        if (p.id !== id) return p
        const next = { ...p, ...patch }
        return { ...next, name: `${next.focusMin} / ${next.shortBreakMin}` }
      }),
    })

  const doExport = async () => {
    try {
      const r = await shareOrDownload()
      if (r !== 'cancelled') setToast('Sicherung erstellt')
    } catch {
      setToast('Export fehlgeschlagen')
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setImportError(null)
    const result = parseBackup(await file.text())
    if (fileRef.current) fileRef.current.value = ''
    if (!result.ok) setImportError(result.error)
    else setPending({ backup: result.backup, summary: result.summary })
  }

  const confirmImport = async () => {
    if (!pending) return
    await importBackup(pending.backup)
    setPending(null)
    await actions.reload()
    setName(getState().settings.name)
    setToast('Daten wiederhergestellt')
  }

  return (
    <main className="screen enter">
      <h1 className="screen-title">Mehr</h1>

      <p className="section-label">Du</p>
      <section className="glass list">
        <label className="row">
          <span className="row-label">Name</span>
          <input
            className="field settings-inline"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => actions.saveSettings({ name: name.trim() })}
            placeholder="für die Begrüßung"
            maxLength={30}
            autoComplete="given-name"
            enterKeyHint="done"
          />
        </label>
      </section>

      <p className="section-label">Ziele</p>
      <section className="glass list">
        <div className="row">
          <span className="row-label">
            Wochenziel
            <span className="row-sub">Lernzeit pro Woche</span>
          </span>
          <Stepper
            label="Wochenziel"
            value={settings.weeklyGoalMin / 60}
            min={1}
            max={60}
            onChange={(h) => actions.saveSettings({ weeklyGoalMin: h * 60 })}
            format={(h) => `${h} h`}
          />
        </div>
        <div className="row">
          <span className="row-label">
            Serie zählt ab
            <span className="row-sub">Fokuszeit pro Tag</span>
          </span>
          <Stepper
            label="Serie zählt ab"
            value={settings.streakMinPerDay}
            min={5}
            max={240}
            step={5}
            onChange={(m) => actions.saveSettings({ streakMinPerDay: m })}
            format={(m) => `${m} min`}
          />
        </div>
      </section>

      <p className="section-label">Takt</p>
      {settings.presets.map((p) => (
        <section key={p.id} className="glass list">
          <div className="row">
            <span className="row-label">
              Fokus
              <span className="row-sub">{p.id === settings.defaultPresetId ? 'Standard' : 'Alternative'}</span>
            </span>
            <Stepper label="Fokus" value={p.focusMin} min={5} max={120} step={5} onChange={(v) => updatePreset(p.id, { focusMin: v })} format={(v) => `${v} min`} />
          </div>
          <div className="row">
            <span className="row-label">Kurze Pause</span>
            <Stepper label="Kurze Pause" value={p.shortBreakMin} min={1} max={30} onChange={(v) => updatePreset(p.id, { shortBreakMin: v })} format={(v) => `${v} min`} />
          </div>
          <div className="row">
            <span className="row-label">Lange Pause</span>
            <Stepper label="Lange Pause" value={p.longBreakMin} min={5} max={60} step={5} onChange={(v) => updatePreset(p.id, { longBreakMin: v })} format={(v) => `${v} min`} />
          </div>
          <div className="row">
            <span className="row-label">
              Runden
              <span className="row-sub">bis zur langen Pause</span>
            </span>
            <Stepper label="Runden bis zur langen Pause" value={p.roundsUntilLong} min={2} max={8} onChange={(v) => updatePreset(p.id, { roundsUntilLong: v })} format={(v) => String(v)} />
          </div>
        </section>
      ))}
      <section className="glass list">
        <div className="row">
          <span className="row-label">
            Freie Session
            <span className="row-sub">Startwert</span>
          </span>
          <Stepper label="Freie Session" value={settings.freeDefaultMin} min={5} max={180} step={5} onChange={(v) => actions.saveSettings({ freeDefaultMin: v })} format={(v) => `${v} min`} />
        </div>
      </section>

      <p className="section-label">Timer</p>
      <section className="glass list">
        <label className="row">
          <span className="row-label">
            Bildschirm anlassen
            <span className="row-sub">während eine Session läuft</span>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={settings.keepScreenOn}
            onChange={(e) => actions.saveSettings({ keepScreenOn: e.target.checked })}
          />
        </label>
        <div className="row">
          <span className="row-label">
            Tag beginnt um
            <span className="row-sub">Lernen davor zählt zum Vortag</span>
          </span>
          <Stepper
            label="Tagesbeginn"
            value={settings.dayStartHour}
            min={0}
            max={8}
            onChange={(h) => actions.saveSettings({ dayStartHour: h })}
            format={(h) => `${String(h).padStart(2, '0')}:00`}
          />
        </div>
      </section>

      <p className="section-label">Daten</p>
      <section className="glass list">
        <button className="row settings-action pressable" onClick={doExport}>
          <span className="row-label">
            Sicherung exportieren
            <span className="row-sub">als JSON-Datei, z. B. „In Dateien sichern“</span>
          </span>
          <span className="faint">›</span>
        </button>
        <button className="row settings-action pressable" onClick={() => fileRef.current?.click()}>
          <span className="row-label">
            Sicherung importieren
            <span className="row-sub">ersetzt alle Daten auf diesem Gerät</span>
          </span>
          <span className="faint">›</span>
        </button>
      </section>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {importError && <p className="settings-error">{importError}</p>}
      <p className="faint settings-foot">
        Alle Daten liegen nur auf diesem iPhone. Wird die Web-App vom Home-Bildschirm gelöscht, sind sie weg. Exportiere
        deshalb ab und zu eine Sicherung.
      </p>

      <p className="section-label">Info</p>
      <section className="glass list">
        <a className="row settings-action" href={routeUrl('check')}>
          <span className="row-label">iOS-Check</span>
          <span className="faint">›</span>
        </a>
        <div className="row">
          <span className="row-label">Version</span>
          <span className="faint">{__APP_VERSION__}</span>
        </div>
      </section>

      <Sheet open={!!pending} onClose={() => setPending(null)} label="Sicherung importieren">
        <h2 className="sheet-title">Sicherung importieren?</h2>
        {pending && (
          <p className="muted">
            Vom {pending.summary.exportedAt ? new Date(pending.summary.exportedAt).toLocaleString('de-DE') : 'unbekannten Datum'}:{' '}
            {pending.summary.subjects} Fächer, {pending.summary.tasks} Aufgaben, {pending.summary.sessions} Sessions. Alle
            aktuellen Daten auf diesem iPhone werden ersetzt.
          </p>
        )}
        <div className="sheet-actions">
          <button className="btn" onClick={doExport}>
            Vorher aktuelle Daten sichern
          </button>
          <button className="btn btn-danger" onClick={confirmImport}>
            Ersetzen
          </button>
          <button className="btn btn-plain" onClick={() => setPending(null)}>
            Abbrechen
          </button>
        </div>
      </Sheet>

      {toast && <Toast text={toast} />}
    </main>
  )
}
