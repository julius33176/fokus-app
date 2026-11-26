import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { routeUrl } from '../../router/router.ts'
import './check.css'

// iOS-Check: prüft die Plattform-Annahmen aus PLAN.md, Abschnitt 4.5/6.
// Vorübergehende Seite, wird in Phase 3 in die Einrichtungsanleitung übernommen.

type Ctx = 'standalone' | 'safari'
interface LogEntry {
  t: number
  ctx: Ctx
  params: string
}

const LOG_KEY = 'fokus-check-log'
const ID_KEY = 'fokus-check-id'
const NOTE_KEY = 'fokus-check-note'

function detectContext(): Ctx {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  return standalone ? 'standalone' : 'safari'
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* privates Fenster o. Ä. – Anzeige funktioniert trotzdem */
  }
}

function storageId(): { id: string; since: number } {
  const existing = readJson<{ id: string; since: number } | null>(ID_KEY, null)
  if (existing) return existing
  const id = Math.random().toString(36).slice(2, 8).toUpperCase()
  const created = { id, since: Date.now() }
  writeJson(ID_KEY, created)
  return created
}

function fmt(t: number) {
  return new Date(t).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function versionInfo() {
  const ua = navigator.userAgent
  const os = ua.match(/OS (\d+)_(\d+)(?:_(\d+))? like Mac OS X/)
  const safari = ua.match(/Version\/(\d+(?:\.\d+)*)/)
  return {
    os: os ? `${os[1]}.${os[2]}${os[3] ? '.' + os[3] : ''}` : 'unbekannt',
    safari: safari ? safari[1] : 'unbekannt',
    ua,
  }
}

export function CheckPage() {
  const ctx = useMemo(detectContext, [])
  const store = useMemo(storageId, [])
  const version = useMemo(versionInfo, [])
  const [log, setLog] = useState<LogEntry[]>(() => readJson<LogEntry[]>(LOG_KEY, []))
  const [note, setNote] = useState(() => readJson<string>(NOTE_KEY, ''))
  const [copied, setCopied] = useState<'idle' | 'ok' | 'manual'>('idle')

  // Einmalig beim Laden lesen – die URL wird danach bereinigt.
  const [search] = useState(() => window.location.search.replace(/^\?/, ''))
  const arrivedVia = useMemo(() => {
    const params = new URLSearchParams(search)
    return params.get('via') ?? params.get('ret')
  }, [search])

  // Jeder Aufruf mit ?via=… oder ?ret=… wird protokolliert (im Speicher DIESES Kontexts).
  useEffect(() => {
    if (!arrivedVia) return
    const entry: LogEntry = { t: Date.now(), ctx, params: search }
    setLog((prev) => {
      const next = [entry, ...prev].slice(0, 30)
      writeJson(LOG_KEY, next)
      return next
    })
    // Parameter entfernen, damit Neuladen nicht doppelt protokolliert
    window.history.replaceState(null, '', routeUrl('check'))
  }, [])

  useEffect(() => writeJson(NOTE_KEY, note), [note])

  const host = window.location.host
  const base = import.meta.env.BASE_URL
  const httpsUrl = (q: string) => `https://${host}${base}check/?${q}`
  const webappUrl = (q: string) => `webapp://${host}${base}check/?${q}`
  const testAUrl = webappUrl('via=webapp')

  const runB = (ret: 'webapp' | 'https' | 'none') => {
    const name = encodeURIComponent('Fokus Test B')
    const input = `&input=text&text=${encodeURIComponent('Test B lief')}`
    if (ret === 'none') return `shortcuts://run-shortcut?name=${name}${input}`
    const success = ret === 'webapp' ? webappUrl('ret=webapp') : httpsUrl('ret=https')
    return `shortcuts://x-callback-url/run-shortcut?name=${name}${input}&x-success=${encodeURIComponent(success)}`
  }

  const report = [
    'iOS-Check Fokus',
    `Kontext jetzt: ${ctx === 'standalone' ? 'Web-App (Standalone)' : 'Safari-Tab'}`,
    `iOS laut Browser: ${version.os} · Safari-Version: ${version.safari}`,
    `Speicher-Kennung: ${store.id} (seit ${fmt(store.since)})`,
    'Ankünfte in diesem Kontext:',
    ...(log.length
      ? log.map((e) => `- ${fmt(e.t)} · ${e.params} · ${e.ctx === 'standalone' ? 'Web-App' : 'Safari'}`)
      : ['- keine']),
    `Notiz: ${note || '–'}`,
    `UA: ${version.ua}`,
  ].join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report)
      setCopied('ok')
    } catch {
      setCopied('manual')
    }
  }

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* ignorieren */
    }
  }

  return (
    <main className="check">
      <header className="check-header">
        <a className="check-back" href={routeUrl('')}>
          ‹ Fokus
        </a>
        <h1>iOS-Check</h1>
        <p className="check-lead">
          Fünf Minuten, die entscheiden, wie Gate und Kurzbefehle angebunden werden.
        </p>
      </header>

      <section className="check-card check-status" aria-label="Status">
        <Row label="Läuft gerade als">
          <strong className={ctx === 'standalone' ? 'ok' : 'warn'}>
            {ctx === 'standalone' ? 'Web-App (Standalone)' : 'Safari-Tab'}
          </strong>
        </Row>
        <Row label="Speicher-Kennung">
          <strong className="tabular mono">{store.id}</strong>
        </Row>
        <Row label="iOS laut Browser">
          <span className="tabular">
            {version.os} · Safari {version.safari}
          </span>
        </Row>
        {arrivedVia && (
          <Row label="Gerade angekommen über">
            <strong className="ok">{arrivedVia}</strong>
          </Row>
        )}
      </section>

      <Step n={1} title="Als Web-App installieren">
        <p>
          Diese Seite in <b>Safari</b> öffnen → Teilen-Knopf → <b>Zum Home-Bildschirm</b> →
          „Als Web-App öffnen“ <b>an</b> → Hinzufügen. Danach das neue Symbol „Fokus“ öffnen, unten auf
          „Zum iOS-Check“ tippen.
        </p>
      </Step>

      <Step n={2} title="Speicher-Test">
        <p>
          Merke dir die <b>Speicher-Kennung</b> oben einmal in Safari und einmal in der Web-App. Sind
          sie verschieden, haben Safari und Web-App getrennten Speicher (erwartet).
        </p>
      </Step>

      <Step n={3} title="Kurzbefehl öffnet Web-App?">
        <p>
          Kurzbefehle-App → <b>+</b> → Name <b>Fokus Test A</b> → Aktion <b>URLs öffnen</b> mit dieser
          Adresse:
        </p>
        <CodeLine text={testAUrl} onCopy={() => copyText(testAUrl)} />
        <p>
          Kurzbefehl in der Kurzbefehle-App starten. Öffnet sich die <b>Web-App</b> und zeigt oben
          „Gerade angekommen über: webapp“? Falls stattdessen ein Fehler kommt, notiere ihn unten.
        </p>
        <p className="check-hint">Zusatztest in Safari: diesen Link direkt antippen.</p>
        <a className="check-button secondary" href={testAUrl}>
          webapp://-Link antippen
        </a>
      </Step>

      <Step n={4} title="Web-App startet Kurzbefehl und kommt zurück?">
        <p>
          Kurzbefehl <b>Fokus Test B</b> anlegen mit Aktion <b>Mitteilung anzeigen</b>, als Text die
          Variable <b>Kurzbefehleingabe</b> wählen. Dann <b>in der Web-App</b> nacheinander:
        </p>
        <a className="check-button" href={runB('webapp')}>
          B starten · zurück per webapp://
        </a>
        <a className="check-button secondary" href={runB('https')}>
          B starten · zurück per https://
        </a>
        <a className="check-button secondary" href={runB('none')}>
          B starten · ohne Rücksprung
        </a>
        <p className="check-hint">
          Achte auf: Kommt eine Rückfrage („In Kurzbefehle öffnen?“)? Erscheint die Mitteilung
          „Test B lief“? Wo landest du danach: Web-App, Safari oder Kurzbefehle-App?
        </p>
      </Step>

      <Step n={5} title="Ergebnis schicken">
        <label className="check-label" htmlFor="check-note">
          Notiz (Rückfragen, Fehlermeldungen, wo du gelandet bist)
        </label>
        <textarea
          id="check-note"
          className="check-note"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z. B. Test A: Web-App öffnet sich. Test B webapp: Rückfrage ja, zurück in Web-App …"
        />
        <button className="check-button" onClick={copy}>
          {copied === 'ok' ? 'Kopiert ✓' : 'Ergebnis kopieren'}
        </button>
        <p className="check-hint">
          Den Text in den Chat mit Claude einfügen. Am besten einmal aus der Web-App und einmal aus
          Safari kopieren, denn jeder Kontext sieht nur seine eigenen Ankünfte.
        </p>
        {copied === 'manual' && <textarea className="check-note mono" readOnly rows={10} value={report} />}
      </Step>

      <section className="check-card" aria-label="Protokoll">
        <h2>Ankünfte in diesem Kontext</h2>
        {log.length === 0 ? (
          <p className="check-hint">Noch keine.</p>
        ) : (
          <ul className="check-log">
            {log.map((e) => (
              <li key={e.t}>
                <span className="tabular">{fmt(e.t)}</span>
                <span>{e.params}</span>
                <span className={e.ctx === 'standalone' ? 'ok' : 'warn'}>
                  {e.ctx === 'standalone' ? 'Web-App' : 'Safari'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="check-row">
      <span className="check-row-label">{label}</span>
      {children}
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="check-card">
      <h2>
        <span className="check-step tabular">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function CodeLine({ text, onCopy }: { text: string; onCopy: () => void }) {
  const [done, setDone] = useState(false)
  return (
    <div className="check-code">
      <code className="mono">{text}</code>
      <button
        onClick={() => {
          onCopy()
          setDone(true)
        }}
      >
        {done ? '✓' : 'Kopieren'}
      </button>
    </div>
  )
}
