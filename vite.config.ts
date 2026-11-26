import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'

// Pfade, die direkt aufgerufen werden können (z. B. aus Kurzbefehlen).
// GitHub Pages kennt keine SPA-Fallbacks, daher bekommt jeder Pfad eine eigene index.html.
const DEEP_LINK_ROUTES = ['check', 'gate', 'timer', 'stats', 'subjects', 'morning', 'evening', 'setup', 'settings']

function deepLinkCopies(): Plugin {
  return {
    name: 'deep-link-copies',
    apply: 'build',
    closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist')
      const index = resolve(dist, 'index.html')
      for (const route of DEEP_LINK_ROUTES) {
        mkdirSync(resolve(dist, route), { recursive: true })
        copyFileSync(index, resolve(dist, route, 'index.html'))
      }
      copyFileSync(index, resolve(dist, '404.html'))
    },
  }
}

export default defineConfig({
  base: '/fokus-app/',
  plugins: [react(), deepLinkCopies()],
})
