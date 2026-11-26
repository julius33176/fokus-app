# Fokus

Fokus- und Lern-App als PWA fürs iPhone: Fokus-Sessions, App-Schranke („Gate“) mit Limits,
Morgen- und Abendmodus. Alle Daten bleiben lokal auf dem Gerät.

- Live: https://julius33176.github.io/fokus-app/
- Plan und Architektur: [PLAN.md](PLAN.md)
- Aktueller Stand: [PROGRESS.md](PROGRESS.md)

## Entwicklung

```bash
npm install
npm run dev      # lokaler Server
npm run build    # Produktions-Build nach dist/
npm test         # Unit-Tests (ab Phase 2)
```

Jeder Push auf `main` oder den Arbeitsbranch baut und veröffentlicht die App über GitHub Actions
(`.github/workflows/deploy.yml`). Einrichtung und Wartung werden in Phase 5 hier vollständig beschrieben.
