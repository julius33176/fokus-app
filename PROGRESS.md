# PROGRESS

**Aktuelle Phase:** 0 – Plan (abgeschlossen, wartet auf Julius)
**Stand:** PLAN.md, Grundgerüst, iOS-Check-Seite und Deploy-Workflow sind gepusht.

## Erledigt
- [x] Repo geprüft (öffentlich, nur README), Recherche iOS-PWA-Grenzen
- [x] PLAN.md: Architektur, Datenmodell, Kurzbefehl-Konzept, iOS-Grenzen, offene Fragen
- [x] Vite 8 + React 19 + TS 7 Grundgerüst, `base: '/fokus-app/'`, Deep-Link-Kopien (`/check/`, `/gate/` …, `404.html`)
- [x] Manifest + Icons (Installation als Web-App)
- [x] iOS-Check-Seite `/check` (Speicher-Kennung, webapp://-Test, x-success-Test, Ergebnis kopieren)
- [x] Workflow `.github/workflows/deploy.yml` (Build + Pages-Deploy bei Push auf `main` und Arbeitsbranch)
- Belege: `npm run build` ohne Fehler (JS 71 kB gzip). Playwright (iPhone 15): `/`, `/check/?via=webapp`
  ohne Konsolenfehler, Ankunft wird protokolliert, `/gate/?app=instagram` liefert HTTP 200.

## Nächster konkreter Schritt
- Warten auf Julius: Pages aktivieren, iOS-Check machen, offene Fragen beantworten (PLAN.md, Abschnitt 8).
- Danach Phase 1: 3 Designrichtungen für Startscreen und Timer als umschaltbare Vorschau.

## Offene Fragen an Julius
Siehe PLAN.md, Abschnitt 8 (Pages-Einstellungen, iOS-Version, iOS-Check, Überschreiben global/pro App,
Tagesgrenze, Streak-Definition, Gate-Apps).

## Von Julius zu testen
- iOS-Check (`https://julius33176.github.io/fokus-app/check/`): Speicher getrennt? `webapp://` öffnet
  Web-App? Rückfrage bei `shortcuts://`? `x-success` zurück in die Web-App?

## Bekannte Probleme
- Deploy funktioniert erst, wenn GitHub Pages in den Repo-Einstellungen aktiviert ist (Source: GitHub Actions)
  und der Arbeitsbranch im Environment `github-pages` erlaubt ist. Das kann nur Julius einstellen.
