# PROGRESS

**Aktuelle Phase:** 0 – Plan (abgeschlossen, wartet auf Julius)
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
- Folgerung und Optionen A2/B: PLAN.md 4.6. Entscheidung von Julius steht aus.

## Nächster konkreter Schritt
- Warten auf Julius: Entscheidung A2 oder B (PLAN.md 4.6/8), Annahmen zu Überschreiben und Streak bestätigen.
- Danach Phase 1: 3 Designrichtungen für Startscreen und Timer als umschaltbare Vorschau.

## Aufgaben für Julius
- Nachtest erledigt (27.11. vormittags). Offen: Entscheidung A2 oder B, Annahmen bestätigen.

## Offene Fragen an Julius
Siehe PLAN.md, Abschnitt 8 (Pages-Einstellungen, iOS-Version, iOS-Check, Überschreiben global/pro App,
Tagesgrenze, Streak-Definition, Gate-Apps).

## Von Julius zu testen
- iOS-Check (`https://julius33176.github.io/fokus-app/check/`): Speicher getrennt? `webapp://` öffnet
  Web-App? Rückfrage bei `shortcuts://`? `x-success` zurück in die Web-App?

## Bekannte Probleme
- Die Live-Seite kann ich aus der Cloud-Umgebung nicht abrufen (github.io gesperrt). Ob sie lädt, sieht nur Julius.
