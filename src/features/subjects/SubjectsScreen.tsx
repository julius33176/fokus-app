import { useMemo, useState } from 'react'
import { actions, useAppState } from '../../app/store.ts'
import { SUBJECT_COLORS } from '../../db/repo.ts'
import type { Subject } from '../../db/types.ts'
import { dayKey, weekKeys } from '../../domain/dates.ts'
import { formatDurationText, totalsBySubject } from '../../domain/stats.ts'
import { Sheet } from '../../ui/components.tsx'
import { IconCheck, IconPlus } from '../../ui/icons.tsx'
import './subjects.css'

export function SubjectsScreen() {
  const { subjects, tasks, sessions, settings } = useAppState()
  const [editing, setEditing] = useState<Subject | 'new' | null>(null)
  const [showArchived, setShowArchived] = useState(false)

  const week = new Set(weekKeys(dayKey(Date.now(), settings.dayStartHour)))
  const weekBySubject = useMemo(() => totalsBySubject(sessions, week), [sessions]) // eslint-disable-line react-hooks/exhaustive-deps
  const active = subjects.filter((s) => !s.archived)
  const archived = subjects.filter((s) => s.archived)

  const card = (s: Subject) => {
    const open = tasks.filter((t) => t.subjectId === s.id && !t.done).length
    return (
      <button key={s.id} className="glass subject-card pressable" onClick={() => setEditing(s)}>
        <span className="subject-dot" style={{ background: s.color }} />
        <span className="subject-text">
          <span className="subject-name">{s.name}</span>
          <span className="subject-meta">
            {formatDurationText(weekBySubject.get(s.id) ?? 0)} diese Woche · {open} {open === 1 ? 'offene Aufgabe' : 'offene Aufgaben'}
          </span>
        </span>
        <span className="subject-chevron" aria-hidden="true">
          ›
        </span>
      </button>
    )
  }

  return (
    <main className="screen enter">
      <h1 className="screen-title">Fächer</h1>
      {active.length === 0 && <p className="empty">Noch keine Fächer. Lege dein erstes Fach an.</p>}
      {active.map(card)}
      <button className="btn subject-add" onClick={() => setEditing('new')}>
        <IconPlus size={18} /> Neues Fach
      </button>

      {archived.length > 0 && (
        <>
          <button className="btn btn-plain" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Archiv ausblenden' : `Archiv anzeigen (${archived.length})`}
          </button>
          {showArchived && archived.map(card)}
        </>
      )}

      {editing && <SubjectSheet subject={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </main>
  )
}

function SubjectSheet({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const { tasks, subjects } = useAppState()
  const [name, setName] = useState(subject?.name ?? '')
  const [color, setColor] = useState(subject?.color ?? SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length])
  const [newTask, setNewTask] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const current = subject ? subjects.find((s) => s.id === subject.id) ?? subject : null
  const subjectTasks = current
    ? tasks.filter((t) => t.subjectId === current.id).sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt)
    : []

  const save = async () => {
    if (!name.trim()) return
    if (current) await actions.updateSubject({ ...current, name: name.trim(), color })
    else await actions.addSubject(name, color)
    onClose()
  }

  const addTask = async () => {
    if (!current || !newTask.trim()) return
    await actions.addTask(current.id, newTask)
    setNewTask('')
  }

  return (
    <Sheet open onClose={onClose} label={current ? 'Fach bearbeiten' : 'Neues Fach'}>
      <h2 className="sheet-title">{current ? 'Fach bearbeiten' : 'Neues Fach'}</h2>
      <label className="section-label" htmlFor="subject-name">
        Name
      </label>
      <input
        id="subject-name"
        className="field"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="z. B. Strömungslehre"
        maxLength={40}
        autoComplete="off"
        enterKeyHint="done"
        onKeyDown={(e) => e.key === 'Enter' && void save()}
      />
      <p className="section-label">Farbe</p>
      <div className="swatches" role="radiogroup" aria-label="Farbe">
        {SUBJECT_COLORS.map((c) => (
          <button
            key={c}
            role="radio"
            aria-checked={c === color}
            aria-label={`Farbe ${c}`}
            className={`swatch ${c === color ? 'is-on' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>

      {current && (
        <>
          <p className="section-label">Aufgaben</p>
          <div className="glass list task-list">
            {subjectTasks.length === 0 && <p className="empty">Noch keine Aufgaben.</p>}
            {subjectTasks.map((t) => (
              <div key={t.id} className={`row task-row ${t.done ? 'is-done' : ''}`}>
                <button
                  className={`task-check ${t.done ? 'is-on' : ''}`}
                  role="checkbox"
                  aria-checked={t.done}
                  aria-label={t.done ? `${t.title} wieder öffnen` : `${t.title} erledigt`}
                  onClick={() => actions.updateTask({ ...t, done: !t.done, doneAt: t.done ? undefined : Date.now() })}
                >
                  {t.done && <IconCheck size={16} />}
                </button>
                <span className="row-label">{t.title}</span>
                <button className="task-delete" aria-label={`${t.title} löschen`} onClick={() => actions.deleteTask(t.id)}>
                  ×
                </button>
              </div>
            ))}
            <div className="row">
              <input
                className="field task-input"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Neue Aufgabe, z. B. Übungsblatt 6"
                maxLength={80}
                enterKeyHint="done"
                onKeyDown={(e) => e.key === 'Enter' && void addTask()}
              />
              <button className="icon-btn" aria-label="Aufgabe hinzufügen" onClick={addTask} disabled={!newTask.trim()}>
                <IconPlus size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      <div className="sheet-actions">
        <button className="cta" onClick={save} disabled={!name.trim()}>
          {current ? 'Speichern' : 'Fach anlegen'}
        </button>
        {current && (
          <button
            className="btn"
            onClick={async () => {
              await actions.updateSubject({ ...current, archived: !current.archived })
              onClose()
            }}
          >
            {current.archived ? 'Wieder aktivieren' : 'Archivieren'}
          </button>
        )}
        {current &&
          (confirmDelete ? (
            <button
              className="btn btn-danger"
              onClick={async () => {
                await actions.deleteSubject(current.id)
                onClose()
              }}
            >
              Endgültig löschen (Sessions bleiben in der Statistik)
            </button>
          ) : (
            <button className="btn btn-plain btn-danger" onClick={() => setConfirmDelete(true)}>
              Fach löschen
            </button>
          ))}
      </div>
    </Sheet>
  )
}
