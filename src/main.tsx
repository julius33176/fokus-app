import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { startEventLog } from './features/check/eventlog.ts'
import './styles/base.css'

// Vorübergehend für den iOS-Check: läuft auf jeder Seite, damit auch ein Start auf "/" erfasst wird.
startEventLog()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
