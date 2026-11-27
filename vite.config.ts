import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
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

function listFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = resolve(dir, name)
    return statSync(full).isDirectory() ? listFiles(full) : [full]
  })
}

/** Schreibt dist/sw.js mit Liste aller Dateien und einer Version aus deren Inhalt (eigener SW statt Workbox). */
function serviceWorker(base: string): Plugin {
  return {
    name: 'fokus-service-worker',
    apply: 'build',
    enforce: 'post',
    closeBundle() {
      const dist = resolve(import.meta.dirname, 'dist')
      const files = listFiles(dist)
        .map((f) => relative(dist, f).split('\\').join('/'))
        .filter((f) => f !== 'sw.js' && f !== '404.html')
        .sort()
      const hash = createHash('sha256')
      for (const f of files) hash.update(f).update(readFileSync(resolve(dist, f)))
      const version = hash.digest('hex').slice(0, 12)
      const template = readFileSync(resolve(import.meta.dirname, 'sw/sw-template.js'), 'utf8')
      writeFileSync(
        resolve(dist, 'sw.js'),
        template
          .replace('__VERSION__', version)
          .replace('__BASE__', base)
          .replace('__PRECACHE__', JSON.stringify(files)),
      )
    },
  }
}

const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8')) as { version: string }
const buildDate = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  base: '/fokus-app/',
  define: {
    __APP_VERSION__: JSON.stringify(`${pkg.version} · ${buildDate}`),
  },
  plugins: [react(), deepLinkCopies(), serviceWorker('/fokus-app/')],
})
