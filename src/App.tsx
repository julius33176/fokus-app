import { CheckPage } from './features/check/CheckPage.tsx'
import { PreviewApp } from './features/preview/PreviewApp.tsx'
import { currentRoute } from './router/router.ts'

export function App() {
  const route = currentRoute()
  if (route === 'check') return <CheckPage />
  // Phase 1: Startseite ist die Design-Vorschau
  return <PreviewApp />
}
