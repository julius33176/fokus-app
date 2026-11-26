import { CheckPage } from './features/check/CheckPage.tsx'
import { currentRoute, routeUrl } from './router/router.ts'
import './App.css'

export function App() {
  const route = currentRoute()
  if (route === 'check') return <CheckPage />
  return <Placeholder />
}

function Placeholder() {
  return (
    <main className="placeholder">
      <p className="placeholder-kicker">Phase 0 · Grundgerüst</p>
      <h1>Fokus</h1>
      <p className="placeholder-text">
        Die App entsteht gerade. Bitte zuerst den iOS-Check machen, er entscheidet, wie Gate und
        Kurzbefehle angebunden werden.
      </p>
      <a className="placeholder-button" href={routeUrl('check')}>
        Zum iOS-Check
      </a>
    </main>
  )
}
