import { useEffect, useState } from 'react'
import { actions, useAppState } from '../../app/store.ts'
import { Sheet } from '../../ui/components.tsx'

const LABELS = ['', 'Zerstreut', 'Eher unruhig', 'Okay', 'Konzentriert', 'Voll da']

/** Kurze Bewertung nach jeder Session: Konzentration 1–5 und optionale Notiz. */
export function RatingSheet() {
  const { ratingSessionId, sessions, subjects } = useAppState()
  const session = sessions.find((s) => s.id === ratingSessionId)
  const [rating, setRating] = useState<number | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    setRating(session?.rating ?? null)
    setNote(session?.note ?? '')
    // nur beim Öffnen einer anderen Session zurücksetzen
  }, [ratingSessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!session) return null
  const subject = subjects.find((s) => s.id === session.subjectId)
  const minutes = Math.round(session.focusMs / 60_000)
  const close = () => actions.openRating(null)

  const save = async () => {
    await actions.saveSession({
      ...session,
      rating: (rating ?? undefined) as 1 | 2 | 3 | 4 | 5 | undefined,
      note: note.trim() || undefined,
    })
    close()
  }

  return (
    <Sheet open onClose={close} label="Session bewerten">
      <h2 className="sheet-title">Wie konzentriert warst du?</h2>
      <p className="muted rating-summary">
        {minutes} min {subject?.name ?? ''} · {session.distractions.length}{' '}
        {session.distractions.length === 1 ? 'Ablenkung' : 'Ablenkungen'}
        {session.status === 'aborted' ? ' · vorzeitig beendet' : ''}
      </p>
      <div className="rating" role="radiogroup" aria-label="Konzentration von 1 bis 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} – ${LABELS[n]}`}
            className={`rating-dot ${rating !== null && n <= rating ? 'is-on' : ''}`}
            onClick={() => setRating(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="rating-label" aria-hidden="true">
        {rating ? LABELS[rating] : ' '}
      </p>
      <textarea
        className="field"
        rows={3}
        placeholder="Notiz (optional): Was lief gut, was hat gestört?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
      />
      <div className="sheet-actions">
        <button className="cta" onClick={save}>
          Speichern
        </button>
        <button className="btn btn-plain" onClick={close}>
          Überspringen
        </button>
      </div>
    </Sheet>
  )
}
