// Ablaufsteuerung der Fokus-Sessions über dem reinen Timer-Automaten (domain/timer.ts).
// Läuft app-weit: Endet eine Fokus-Phase, während man auf einem anderen Bildschirm ist (oder die App
// im Hintergrund war), wird sie beim nächsten Tick korrekt mit dem berechneten Endzeitpunkt gespeichert.

import * as T from '../domain/timer.ts'
import { actions, getState } from './store.ts'

let completing: string | null = null

export async function startSession(config: T.TimerConfig, subjectId: string, taskId?: string) {
  const t = T.startFocus(config, subjectId, taskId, Date.now())
  await actions.setActiveTimer(t)
  if (getState().settings.lastSubjectId !== subjectId) await actions.saveSettings({ lastSubjectId: subjectId })
}

export async function togglePause() {
  const t = getState().activeTimer
  if (!t) return
  const now = Date.now()
  await actions.setActiveTimer(T.isPaused(t) ? T.resume(t, now) : T.pause(t, now))
}

export async function addDistraction() {
  const t = getState().activeTimer
  if (!t) return
  await actions.setActiveTimer(T.addDistraction(t, Date.now()))
}

/** Prüft, ob die laufende Fokus-Phase abgelaufen ist, und schließt sie genau einmal ab. */
export async function completeIfDue(now = Date.now()) {
  const t = getState().activeTimer
  if (!t || t.phase !== 'focus' || T.isPaused(t) || !T.isPhaseDone(t, now)) return
  if (completing === t.sessionId) return
  completing = t.sessionId
  try {
    const endAt = T.phaseEndAt(t, now)
    const { settings } = getState()
    await actions.saveSession(T.toSessionRecord(t, endAt, 'completed', settings.dayStartHour))
    // Pause beginnt genau zum Ende der Fokus-Phase (auch wenn die App im Hintergrund war)
    await actions.setActiveTimer(T.nextPhase(t, endAt))
    actions.openRating(t.sessionId)
  } finally {
    completing = null
  }
}

/** Nach einer Pause: nächste Fokus-Runde starten. */
export async function startNextRound() {
  const t = getState().activeTimer
  if (!t || t.phase === 'focus') return
  await actions.setActiveTimer(T.nextPhase(t, Date.now()))
}

/** Pause überspringen bzw. Session-Folge in der Pause beenden. */
export async function endSequence() {
  await actions.setActiveTimer(null)
}

/** Fokus-Phase vorzeitig beenden. save=true speichert die tatsächliche Fokuszeit als abgebrochene Session. */
export async function abortFocus(save: boolean) {
  const t = getState().activeTimer
  if (!t || t.phase !== 'focus') return
  const now = Date.now()
  await actions.setActiveTimer(null)
  if (save) {
    const rec = T.toSessionRecord(t, now, 'aborted', getState().settings.dayStartHour)
    if (rec.focusMs >= 60_000) {
      await actions.saveSession(rec)
      actions.openRating(rec.id)
    }
  }
}
