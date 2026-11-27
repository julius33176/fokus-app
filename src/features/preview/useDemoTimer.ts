import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

// Demo-Timer für die Vorschau. Rechnet wie der spätere echte Timer aus Zeitstempeln
// (nicht mit setInterval), damit Hintergrund/Pausen korrekt bleiben.
// Der Ring wird per subscribe() direkt pro Frame gezeichnet, React rendert nur bei Sekundenwechsel.

export type TimerStatus = 'running' | 'paused' | 'done'

export interface DemoTimer {
  status: TimerStatus
  totalMs: number
  remainingSec: number
  distractions: number
  pause: () => void
  resume: () => void
  restart: (startElapsedMs?: number) => void
  addDistraction: () => void
  /** Ruft fn sofort und danach pro Frame mit dem Fortschritt 0…1 auf. */
  subscribe: (fn: (progress: number) => void) => () => void
}

export function useDemoTimer(totalMs: number, speed: number, initialElapsedMs = 0): DemoTimer {
  const accum = useRef(initialElapsedMs) // abgelaufene Zeit bis zum letzten Start/Pause
  const runningSince = useRef<number | null>(performance.now())
  const speedRef = useRef(speed)
  const listeners = useRef(new Set<(p: number) => void>())

  const [status, setStatus] = useState<TimerStatus>('running')
  const [remainingSec, setRemainingSec] = useState(Math.ceil((totalMs - initialElapsedMs) / 1000))
  const [distractions, setDistractions] = useState(2)

  const elapsed = useCallback(() => {
    const since = runningSince.current
    const run = since === null ? 0 : (performance.now() - since) * speedRef.current
    return Math.min(totalMs, accum.current + run)
  }, [totalMs])

  // Geschwindigkeitswechsel: bisherige Zeit festschreiben, dann mit neuer Rate weiter
  useEffect(() => {
    if (runningSince.current !== null) {
      accum.current = elapsed()
      runningSince.current = performance.now()
    }
    speedRef.current = speed
  }, [speed, elapsed])

  const notify = useCallback(() => {
    const p = elapsed() / totalMs
    listeners.current.forEach((fn) => fn(p))
    return p
  }, [elapsed, totalMs])

  useEffect(() => {
    if (status !== 'running') return
    let frame = 0
    const tick = () => {
      const p = notify()
      const sec = Math.ceil((totalMs - elapsed()) / 1000)
      setRemainingSec((prev) => (prev === sec ? prev : sec))
      if (p >= 1) {
        accum.current = totalMs
        runningSince.current = null
        setStatus('done')
        return
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    // Nach Rückkehr aus dem Hintergrund sofort korrekt zeichnen
    const onVisible = () => document.visibilityState === 'visible' && notify()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [status, notify, elapsed, totalMs])

  const pause = useCallback(() => {
    accum.current = elapsed()
    runningSince.current = null
    setStatus('paused')
    notify()
  }, [elapsed, notify])

  const resume = useCallback(() => {
    runningSince.current = performance.now()
    setStatus('running')
  }, [])

  const restart = useCallback(
    (startElapsedMs = 0) => {
      accum.current = startElapsedMs
      runningSince.current = performance.now()
      setRemainingSec(Math.ceil((totalMs - startElapsedMs) / 1000))
      setDistractions(0)
      setStatus('running')
      notify()
    },
    [totalMs, notify],
  )

  const addDistraction = useCallback(() => setDistractions((d) => d + 1), [])

  const subscribe = useCallback(
    (fn: (p: number) => void) => {
      listeners.current.add(fn)
      fn(elapsed() / totalMs)
      return () => {
        listeners.current.delete(fn)
      }
    },
    [elapsed, totalMs],
  )

  return { status, totalMs, remainingSec, distractions, pause, resume, restart, addDistraction, subscribe }
}

/** Hängt eine Zeichenfunktion an den Timer (z. B. Ring-Fortschritt per Ref setzen). */
export function useTimerFrame(timer: DemoTimer, draw: (progress: number) => void) {
  const drawRef = useRef(draw)
  useLayoutEffect(() => {
    drawRef.current = draw
  })
  const { subscribe } = timer
  useEffect(() => subscribe((p) => drawRef.current(p)), [subscribe])
}
