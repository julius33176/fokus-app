# DESIGN – Aurora

Gewählt von Julius am 27.11. (Phase 1). Dieses Dokument ist die verbindliche Designsprache.
Neue Bildschirme halten sich daran, Abweichungen nur mit Begründung.

## Haltung

Fokus soll sich anfühlen wie eine System-App von Apple: ruhig, hochwertig, atmosphärisch.
Die Stimmung kommt aus **Licht und Farbe des Hintergrunds**, nicht aus Dekoration. Inhalte sitzen
auf **Glas**, Zahlen sind **groß und dünn**. Bewegung ist langsam im Hintergrund und schnell und
direkt bei Berührung.

## Farbe: Himmel und Paletten

Jeder Bildschirm liegt auf dem „Himmel“: Grundfarbe `--m-bg` plus drei große, weiche Lichtflächen
(`--m-c1`, `--m-c2`, `--m-c3`), die in 50–65 s langsam treiben. Akzente `--m-accent`, `--m-accent-2`,
Text `--m-ink`. Paletten wechseln mit 1,2 s Überblendung (registrierte CSS-Properties).

**Welche Palette gilt?**
1. Läuft eine Fokus-Session → **Fokus** (kühl).
2. Morgen- oder Abendmodus aktiv (Phase 4) → **Morgen** (warm) bzw. **Abend** (gedimmt).
3. Sonst → **Tageszeit-Palette** (Julius' Wunsch vom 27.11.):

| Tageszeit | Zeitraum | Stimmung | c1 / c2 / c3 | Akzent |
|---|---|---|---|---|
| Dämmerung | 05–08 | Rosé, Pfirsich | #8a3d4f / #c27a4a / #3b2a5a | #ffc2a1 → #ff8fa3 |
| Vormittag | 08–12 | klares Blau | #1d5fa8 / #1a8fb0 / #2b3f8f | #9fdcff → #7aa2ff |
| Nachmittag | 12–17 | Türkis, Salbei | #0f6b78 / #3c8a6a / #24407a | #8ee6d4 → #6fb3ff |
| Abend | 17–21 | Bernstein, Pflaume | #8a3a1f / #6b2a55 / #2a1f4a | #ffbe7a → #e88ab0 |
| Nacht | 21–05 | tiefes Indigo | #1a1f4f / #2b1a45 / #0c2a3a | #b3b8ff → #8a7dff |

Modus-Paletten: Fokus `#1b3c94 / #0b6a8e / #3a2b8f`, Akzent `#8fd3ff → #7088ff`;
Morgen `#93401c / #c06a26 / #74233f`, Akzent `#ffc684 → #ff8f6b`;
Abend `#2c1f3b / #3b2520 / #161a2c`, Akzent `#d9b590 → #a88bc8`, Text gedimmt `#e4ddd6`.

Abgeleitete Töne immer per `color-mix(in oklab, var(--m-ink) X%, transparent)`:
Text 2 = 66 %, Text 3 = 44 %. Glas = `rgba(255,255,255,.07)` + `backdrop-filter: blur(24px) saturate(150%)`,
Oberkante `rgba(255,255,255,.12)`.

## Begrüßungszeile

Oben auf dem Startbildschirm: Datum (klein, Versalien) und ein kurzer Satz passend zur Tageszeit,
z. B. „Bereit für eine Nachtsession, Julius?“. Mehrere Varianten pro Tageszeit, pro Tag fest gewählt
(kein Flackern). Ton: du, kurz, freundlich, nie belehrend. Name in den Einstellungen änderbar.

## Typografie

Systemschrift (SF Pro). Zahlen immer `tabular-nums`.

| Rolle | Größe / Gewicht / Laufweite |
|---|---|
| Riesenzahl (Heute, Timer) | 80–84 px / 200 / −0,045 em |
| Titel | 28–34 px / 700 / −0,02 em |
| Kartentitel, Wert | 15–17 px / 600 |
| Fließtext | 17 px / 400 |
| Label klein | 13 px / 600, Versalien +0,04 em (nur Datum) |
| Tab-Beschriftung | 11 px / 600 |

## Form und Abstand

Radien: Karte 24, CTA 18, Chip/Pille 999, Tab-Leiste 28. Seitenrand 18 px + Safe Area.
Abstand zwischen Blöcken 12 px, innen 14–18 px. Touch-Ziele ≥ 44 px.

## Bausteine

- **Glas-Karte** für gruppierte Inhalte. Nie Glas auf Glas stapeln.
- **Chip** (36 px): aus = Glas 8 %, an = Text-Farbe mit Grundfarbe als Schrift. Lange Reihen horizontal wischbar mit Randmaske.
- **CTA** (58 px): Verlauf Akzent → Akzent 2, dunkle Schrift, farbiger Schatten.
- **Runde Knöpfe** im Timer (84 px) wie in der iOS-Uhr: links neutral, rechts Akzent.
- **Ring**: 10 px, Spur 9 % Weiß, Bogen mit Akzentverlauf zeigt **Restzeit** (wird im Uhrzeigersinn aufgezehrt),
  leuchtender Punkt an der Kante. Bei leerem Bogen Bogen und Punkt ausblenden.
- **Tab-Leiste**: schwebendes Glas unten (Heute, Statistik, Fächer, Mehr).

## Bewegung

- Drücken: `scale(.96)` in 100 ms, sofort bei Berührung.
- Bildschirmwechsel: 420 ms, `cubic-bezier(.22,1,.36,1)`, von 97 % einblenden.
- Bestätigungen (Haken, Zähler): kleine Feder mit leichtem Überschwingen.
- Hintergrund treibt nur über `transform`.
- `prefers-reduced-motion`: Treiben aus, Wechsel als kurzes Überblenden.
- `prefers-reduced-transparency`: Glas wird deckend.
