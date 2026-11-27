import { useEffect, useState } from 'react'
import { useAppState } from '../../app/store.ts'
import * as T from '../../domain/timer.ts'
import { navigate } from '../../router/router.ts'

/** Kleine Pille über der Tab-Leiste, solange eine Session läuft (wie ein Mini-Player). */
export function NowPlaying() {
  const { activeTimer: t, subjects } = useAppState()
  const [, tick] = useState(0)

  useEffect(() => {
    if (!t) return
    const id = setInterval(() => tick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [t])

  if (!t) return null
  const rem = T.remainingMs(t, Date.now())
  const total = Math.ceil(rem / 1000)
  const label =
    t.phase === 'focus' ? (subjects.find((s) => s.id === t.subjectId)?.name ?? 'Fokus') : rem > 0 ? 'Pause' : 'Pause vorbei'
  return (
    <button className="now-playing" onClick={() => navigate('timer')}>
      <span className={`now-dot ${T.isPaused(t) ? 'is-paused' : ''}`} />
      <span className="now-label">{label}</span>
      <span className="now-time">
        {rem > 0 ? `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` : '›'}
      </span>
    </button>
  )
}
