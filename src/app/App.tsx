import { useEffect, useState } from 'react'
// Designsystem zuerst laden, damit Bildschirm-Styles es gezielt überschreiben können
import '../ui/aurora.css'
import { CheckPage } from '../features/check/CheckPage.tsx'
import { HomeScreen } from '../features/home/HomeScreen.tsx'
import { SettingsScreen } from '../features/settings/SettingsScreen.tsx'
import { StatsScreen } from '../features/stats/StatsScreen.tsx'
import { SubjectsScreen } from '../features/subjects/SubjectsScreen.tsx'
import { NowPlaying } from '../features/timer/NowPlaying.tsx'
import { RatingSheet } from '../features/timer/RatingSheet.tsx'
import { TimerScreen } from '../features/timer/TimerScreen.tsx'
import { daypartOf, paletteOfDaypart, type Palette } from '../domain/daypart.ts'
import { useRoute, type Route } from '../router/router.ts'
import { Overlay, Sky, TabBar } from '../ui/components.tsx'
import { actions, useAppState } from './store.ts'
import { applyUpdate, useUpdateReady } from './sw.ts'
import { completeIfDue } from './timerController.ts'

export function App() {
  const route = useRoute()
  if (route === 'check') return <CheckPage />
  return <MainApp route={route} />
}

/** Tageszeit-Palette, minütlich aktualisiert. */
function useDaypartPalette(): Palette {
  const [palette, setPalette] = useState(() => paletteOfDaypart(daypartOf(new Date())))
  useEffect(() => {
    const id = setInterval(() => setPalette(paletteOfDaypart(daypartOf(new Date()))), 60_000)
    return () => clearInterval(id)
  }, [])
  return palette
}

function MainApp({ route }: { route: Route }) {
  const s = useAppState()
  const daypartPalette = useDaypartPalette()
  const updateReady = useUpdateReady()

  useEffect(() => {
    void actions.init()
  }, [])

  // App-weiter Takt: Fokus-Phasen auch dann abschließen, wenn ein anderer Bildschirm offen ist
  useEffect(() => {
    if (!s.activeTimer || s.activeTimer.phase !== 'focus') return
    const tick = () => void completeIfDue()
    tick()
    const id = setInterval(tick, 1000)
    const onVisible = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [s.activeTimer])

  // Während einer Session gilt die kühle Fokus-Palette, sonst die Tageszeit (DESIGN.md)
  const palette: Palette = s.activeTimer || route === 'timer' ? 'fokus' : daypartPalette

  return (
    <div className="app" data-palette={palette}>
      <Sky />
      {!s.ready ? null : s.error ? (
        <main className="screen">
          <h1 className="screen-title">Daten konnten nicht geladen werden</h1>
          <p className="muted">{s.error}</p>
          <p className="muted">
            Bitte die App neu starten. Falls das bleibt: Im Safari-Privatmodus ist kein Speichern möglich.
          </p>
        </main>
      ) : (
        <>
          {route === '' && <HomeScreen key="home" />}
          {route === 'stats' && <StatsScreen key="stats" />}
          {route === 'subjects' && <SubjectsScreen key="subjects" />}
          {route === 'settings' && <SettingsScreen key="settings" />}
          {route === 'timer' && <TimerScreen key="timer" />}
          {route !== 'timer' && (
            <>
              <NowPlaying />
              <TabBar route={route} />
            </>
          )}
          <RatingSheet />
          {updateReady && (
            <Overlay>
              <button className="update-pill" onClick={applyUpdate}>
                Neue Version verfügbar · <strong>Neu laden</strong>
              </button>
            </Overlay>
          )}
        </>
      )}
      <div id="overlays" />
    </div>
  )
}
