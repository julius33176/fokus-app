# PROGRESS

**Aktuelle Phase:** 2 – Kern (fertig, wartet auf Julius' Test und OK)
**Stand:** PLAN.md, Grundgerüst, iOS-Check-Seite und Deploy-Workflow sind gepusht. Pages ist live.

## Erledigt
- [x] Repo geprüft (öffentlich, nur README), Recherche iOS-PWA-Grenzen
- [x] PLAN.md: Architektur, Datenmodell, Kurzbefehl-Konzept, iOS-Grenzen, offene Fragen
- [x] Vite 8 + React 19 + TS 7 Grundgerüst, `base: '/fokus-app/'`, Deep-Link-Kopien (`/check/`, `/gate/` …, `404.html`)
- [x] Manifest + Icons (Installation als Web-App)
- [x] iOS-Check-Seite `/check` (Speicher-Kennung, webapp://-Test, x-success-Test, Ergebnis kopieren)
- [x] Workflow `.github/workflows/deploy.yml` (Build + Pages-Deploy bei Push auf `main` und Arbeitsbranch)
- [x] GitHub Pages aktiviert (Julius: Source GitHub Actions, Environment `github-pages` ohne Branch-Beschränkung).
  Deploy-Lauf 45913865193 (Versuch 2) erfolgreich.
- Belege: `npm run build` ohne Fehler (JS 71 kB gzip). Playwright (iPhone 15): `/`, `/check/?via=webapp`
  ohne Konsolenfehler, Ankunft wird protokolliert, `/gate/?app=instagram` liefert HTTP 200.

## iOS-Check, Ergebnis 1 (27.11., Julius)
- Web-App läuft standalone, Safari 26.6.1 (UA meldet iOS 18_7, iOS-UA ist eingefroren).
- „Alles hat geklappt“, aber **keine Ankunft mit `?via=`/`?ret=` protokolliert** → Verdacht: `webapp://` und
  `x-success` holen die Web-App nur nach vorne (oder öffnen die Startseite), ohne die übergebene Adresse zu laden.
- Reaktion: Seitenprotokoll (Laden/Vordergrund/Adresse) in `/check` eingebaut, Nachtest warm/kalt angefragt.

## iOS-Check, Ergebnis 2 (27.11., Nachtest)
- warm: `webapp://` holt Web-App nach vorne, Adresse ignoriert. kalt: Start immer auf `/`.
- `shortcuts://` ohne Rückfrage, Eingabe kommt an. `x-success=webapp://` springt zurück (ohne Adresse).
- Speicher Safari/Web-App getrennt. iOS 26.6.1.
- Julius hat **A2** gewählt (Web-App + Wohin-Abfrage), PLAN.md 4.7. Annahmen Überschreiben (insgesamt) und Streak (30 min/Tag) ohne Widerspruch übernommen.

## Phase 1 – Design (27.11.)
- [x] Vorschau unter `/` mit Steuerung (oben, Pille antippen): Design, Bildschirm Start/Timer, Modus, Zeitraffer 60×
- [x] **Aurora:** Lichtflächen, Glas, dünne große Ziffern, leuchtender Ring zeigt Restzeit (wie iOS-Timer), runde Knöpfe
- [x] **Instrument:** Punktraster, Haarlinien, Monospace-Messwerte, Skala mit 60 Strichen, die mit der Zeit aufleuchten, Zeiger
- [x] **Ruhe:** Serifenschrift (New York), ein weiches Licht, Papierkorn, Satz statt Kennzahlen, dicker matter Ring füllt sich
- [x] Modus-Paletten Fokus (kühl) / Morgen (warm) / Abend (gedimmt) mit 1,2 s Überblendung, reduzierte Bewegung respektiert
- Belege: Build ok (JS 79 kB gzip). Playwright (393×852): alle 3 Richtungen Start→Timer, Uhr läuft (25:00→24:59),
  Ablenkung zählt hoch, Pause friert Uhr ein, Zeitraffer erreicht „Geschafft“, keine Konsolenfehler.
- Hinweis: In der Cloud-Vorschau fehlt die iPhone-Schrift New York; auf dem iPhone sieht Ruhe anders (besser) aus.

## Phase 2 – Kern (27.11.)
- [x] Design Aurora gewählt, DESIGN.md; Zusatzwunsch Tageszeit-Paletten + Begrüßung umgesetzt
- [x] Datenschicht IndexedDB (idb, Schema v1, alle Stores), Einstellungen mit Standardwerten
- [x] Domain: Timer-Automat, Tagesgrenze 04:00, Statistik, Serie ≥ 30 min/Tag, Tageszeit/Begrüßung
- [x] App-Gerüst: Router, Tab-Leiste (Heute, Statistik, Fächer, Mehr), Himmel, Mini-Player
- [x] Startbildschirm mit Schnellstart (Fach, Aufgabe, 25/5, 50/10, Frei mit Dauer)
- [x] Timer: Ring, Pause, Ablenkung, Pomodoro-Pausen, „Pause vorbei“, Abbruch (speichern/verwerfen), Bewertung 1–5 + Notiz, Wake Lock
- [x] Fächer + Aufgaben (anlegen, Farbe, archivieren, löschen, abhaken)
- [x] Statistik-Grundgerüst: Serie, Gesamt, Woche mit Navigation, pro Fach, Ø Ablenkungen, Ø Konzentration, Session-Liste (antippen = bewerten)
- [x] Einstellungen: Name, Wochenziel, Serien-Schwelle, Takt, Tagesbeginn, Bildschirm anlassen, Export (Teilen-Menü), Import mit Vorschau
- [x] Eigener Service Worker: Offline-Start, Update-Hinweis „Neue Version · Neu laden“
- Belege: `npm test` 21/21 grün. `npm run build` ok (JS 87 kB gzip). Playwright-Ende-zu-Ende mit simulierter Uhr:
  Start → 10 min → Ablenkung → Pause (Uhr steht) → Ende → Bewertung → kurze Pause → „Pause vorbei“ → Runde 2 →
  Mini-Player → Abbruch speichern → Statistik (2 Sessions) → Fach + Aufgaben → Export → Import → Neuladen (Daten da), 0 Fehler.
  Offline-Test: Neuladen und Direktaufruf `/stats/` ohne Netz ok, Update-Hinweis und Wechsel auf neue Version ok.
- Entscheidung: vite-plugin-pwa (Workbox) wieder entfernt, weil es 4 Sicherheitswarnungen in Build-Abhängigkeiten
  mitbrachte; eigener SW (sw/sw-template.js) stattdessen. Phase-1-Vorschau entfernt.

## Nächster konkreter Schritt
- Warten auf Julius: Test auf dem iPhone (siehe „Von Julius zu testen“), dann OK für Phase 3 (Gate und Limits).

## Offene Fragen an Julius
Siehe PLAN.md, Abschnitt 8 (Pages-Einstellungen, iOS-Version, iOS-Check, Überschreiben global/pro App,
Tagesgrenze, Streak-Definition, Gate-Apps).

## Von Julius zu testen (Phase 2)
- Web-App einmal wegwischen und neu öffnen (neue Version). Begrüßung und Farben passend zur Uhrzeit?
- Session starten, iPhone sperren, nach ein paar Minuten zurück: Zeit stimmt? Bildschirm bleibt während der Session an?
- Ende einer Session, Bewertung, Pause, nächste Runde; Abbruch mit Speichern
- Export über „Mehr → Sicherung exportieren“ → „In Dateien sichern“; Import aus der Dateien-App
- Flugmodus an → App öffnen: läuft sie offline?
- Optik: Notch/Dynamic Island, Tab-Leiste, Blätter, Tastatur bei Eingaben (kein Zoom)

## Bekannte Probleme
- Die Live-Seite kann ich aus der Cloud-Umgebung nicht abrufen (github.io gesperrt). Ob sie lädt, sieht nur Julius.
- Noch kein Signal am Session-Ende, wenn die App im Hintergrund ist (kommt in Phase 4 über Kurzbefehl + iOS-Timer, wie geplant).
- Fokus „Lernen“ wird beim Start noch nicht aktiviert (Phase 4, Kurzbefehle).
