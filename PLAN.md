# PLAN – Fokus (Arbeitstitel)

Fokus- und Lern-App für Julius als PWA auf dem iPhone. Alles lokal, kostenlos, ohne Backend.
Dieses Dokument ist die verbindliche Grundlage. Abweichungen nur nach Rücksprache.

---

## 1. Repo-Befund (Phase 0)

- Repo `julius33176/fokus-app` ist **öffentlich**, daher ist GitHub Pages kostenlos.
- Inhalt beim Start: nur `README.md` (1 Zeile), ein Commit auf `main`.
- Arbeitsbranch: `claude/fokus-lern-app-ios-nti61q`.
- Umgebung: Node 22, npm 10. Netzwerk zu npm funktioniert. Viele Webseiten (z. B. dev.to) sind
  aus der Cloud-Umgebung nicht abrufbar, Recherche lief über die Websuche.

---

## 2. Architektur

### 2.1 Stack und Abhängigkeiten

| Paket | Art | Zweck | Größe (gzip, ca.) | Begründung |
|---|---|---|---|---|
| react, react-dom | Laufzeit | UI | ~60 kB (React 19) | Vorgabe |
| vite, @vitejs/plugin-react, typescript | Dev | Build | 0 (nur Build) | Vorgabe |
| idb | Laufzeit | IndexedDB mit Promises | ~1,2 kB | spart fehleranfälligen Boilerplate-Code, winzig |
| vite-plugin-pwa (Workbox) | Dev | Service Worker, Precache, Manifest | 0 im App-Bundle, SW ~15 kB | erprobtes Offline-Caching und Update-Ablauf statt Eigenbau |
| vitest, fake-indexeddb | Dev | Unit-Tests für Logik und Datenbank | 0 | Belege für „funktioniert“ |

Bewusst **ohne** Router-Bibliothek (eigener Mini-Router, ~50 Zeilen), **ohne** Chart-Bibliothek (eigene SVGs),
**ohne** Datums-Bibliothek (Intl + kleine Helfer), **ohne** Animations-Bibliothek zum Start
(CSS-Transitions, Web Animations API, kleiner eigener Feder-Löser). Falls in Phase 1/2 eine
Animations-Bibliothek nötig wird (z. B. `motion`), frage ich vorher.

Budget: erstes JS-Bundle unter 120 kB gzip (Phase 0: 71 kB, fast nur React).

### 2.2 Hosting und Deploy

- GitHub Pages über GitHub Actions (`.github/workflows/deploy.yml`): bei jedem Push auf `main`
  oder den Arbeitsbranch wird gebaut, getestet und veröffentlicht.
- URL: `https://julius33176.github.io/fokus-app/` → Vite `base: '/fokus-app/'`.
- **Julius muss einmalig (Repo-Einstellungen, darf ich nicht selbst):**
  1. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
  2. Settings → Environments → `github-pages` → Deployment branches and tags → Regel für
     `claude/fokus-lern-app-ios-nti61q` hinzufügen (sonst darf nur `main` deployen).
     Alternative: Ich deploye nur von `main`, dann musst du nach jeder Phase einen PR mergen.

### 2.3 Routing

Eigener Router auf Basis der History-API. Pfade (alle unter `/fokus-app/`):

| Pfad | Bildschirm |
|---|---|
| `/` | Start (heute, Schnellstart, Wochenziel) |
| `/timer` | laufende Session |
| `/stats` | Statistik |
| `/subjects` | Fächer und Aufgaben |
| `/gate/?app=instagram` | App-Schranke (Einstieg aus Kurzbefehl) |
| `/morning`, `/evening` | Routinen |
| `/setup` | Einrichtungsanleitung mit Testknöpfen |
| `/settings` | Einstellungen, Export/Import |
| `/check` | iOS-Check (nur Phase 0/1, wird danach in `/setup` übernommen) |

Damit Direkteinstiege wie `/fokus-app/gate/?app=x` auf GitHub Pages ohne 404 funktionieren,
kopiert der Build `index.html` nach `gate/index.html`, `check/index.html` usw. Zusätzlich `404.html`
als Rückfall. Offline übernimmt der Service Worker (Navigation → `index.html`).

### 2.4 Ordnerstruktur

```
src/
  main.tsx, App.tsx
  router/            Mini-Router (Link, useRoute, navigate)
  db/                Schema, Öffnen/Migrationen, Repositories, Export/Import
  domain/            reine Logik ohne UI, voll getestet:
                     timer.ts (Zustandsautomat), stats.ts, gate.ts (Limits/Überschreiben),
                     dates.ts (Tagesgrenzen, Wochen), shortcuts.ts (URL-Bau)
  features/          home, timer, subjects, stats, gate, routines, setup, settings
  ui/                Bausteine (Button, Sheet, Ring, Heatmap, Stepper …), tokens.css, motion.ts
public/              Icons, apple-touch-icon
```

### 2.5 Timer-Logik (robust gegen Hintergrund)

iOS friert JavaScript ein, sobald die App im Hintergrund ist. Deshalb zählt der Timer nie mit
`setInterval`, sondern rechnet immer aus Zeitstempeln:

```
verbleibend = geplant − (jetzt − startedAt − pausiert_gesamt)
```

Der Zustand (`activeTimer`) liegt bei jedem Wechsel (Start, Pause, Weiter, Ende) in IndexedDB.
Nach Neuladen, Rückkehr aus dem Hintergrund oder Absturz geht es nahtlos weiter. Ist die Zeit im
Hintergrund abgelaufen, zeigt die App beim Zurückkommen direkt den Abschluss mit Bewertung.
Der Ring wird per `requestAnimationFrame` nur gezeichnet, solange die Seite sichtbar ist.
Optional hält die Wake-Lock-API (ab iOS 18.4 in Web-Apps) den Bildschirm während der Session an.

### 2.6 Offline und Updates

`vite-plugin-pwa` (Workbox `generateSW`): Precache aller Build-Dateien, Navigation fällt offline auf
`index.html` zurück. Bei neuer Version erscheint ein unaufdringlicher Hinweis „Neue Version – neu laden“.
`navigator.storage.persist()` wird beim ersten Start angefragt.

### 2.7 Design-Grundlage (Details in Phase 1)

- CSS-Variablen als Tokens (Farben, Abstände, Radien, Typo-Skala, Kurven, Dauern).
- Hintergrund: großflächiger, langsam animierter Verlauf, je Modus eigene Palette
  (Fokus kühl, Morgen warm, Abend gedimmt). Nur `transform`/`opacity` animiert, bei
  `prefers-reduced-motion` statisch.
- Systemschrift (SF Pro über `-apple-system`), tabellarische Ziffern für Zahlen.
- Safe Areas über `env(safe-area-inset-*)`, `viewport-fit=cover`, `100dvh`,
  kein Tap-Highlight, Eingabefelder ≥ 16 px (kein Auto-Zoom), `overscroll-behavior: none`.

### 2.8 Tests und Belege

- `vitest`: Timer-Automat, Statistik-Aggregation, Limit-/Überschreib-Regeln, Tagesgrenzen,
  Export→Import-Rundlauf (mit `fake-indexeddb`), Kurzbefehl-URL-Bau.
- Playwright (in der Cloud vorinstalliert, nicht im Repo): Rauchtests und Screenshots
  in iPhone-Größe zur Kontrolle.
- Alles, was nur auf dem echten iPhone prüfbar ist, steht in PROGRESS.md als **„von Julius zu testen“**.

---

## 3. Datenmodell (IndexedDB `fokus`, Version 1)

Alle IDs sind zufällige Strings (`crypto.randomUUID()`), alle Zeiten Millisekunden seit 1970.
`day` ist das lokale Datum `YYYY-MM-DD` (Tagesgrenze siehe offene Fragen).

```ts
interface Subject {            // Store "subjects"
  id: string; name: string;    // z. B. "HM", "TM", "Programmieren"
  color: string;               // Akzentfarbe (Palette)
  order: number; archived: boolean; createdAt: number;
}

interface Task {               // Store "tasks", Index: subjectId
  id: string; subjectId: string; title: string;
  done: boolean; createdAt: number; doneAt?: number;
}

interface Session {            // Store "sessions", Indizes: day, subjectId, startedAt
  id: string; subjectId: string; taskId?: string;
  mode: 'free' | 'pomodoro'; presetId?: string; round?: number;
  plannedMs: number;
  startedAt: number; endedAt: number; day: string;
  pauses: { start: number; end: number }[];
  focusMs: number;             // tatsächliche Fokuszeit ohne Pausen
  status: 'completed' | 'aborted';
  distractions: number[];      // Zeitstempel jedes „Ablenkung“-Tipps
  rating?: 1 | 2 | 3 | 4 | 5;  // Konzentration
  note?: string;
}

interface GatedApp {           // Store "apps"
  id: string;                  // Kürzel in der URL, z. B. "instagram"
  name: string;                // "Instagram"
  openScheme: string;          // "instagram://" – womit der Kurzbefehl die App öffnet
  dailyOpenLimit: number;      // Öffnungen pro Tag
  passMinutes: number;         // Durchlass-Fenster nach „Trotzdem öffnen“
  screenTimeHint?: string;     // passendes Bildschirmzeit-Limit, z. B. "30 min/Tag"
  enabled: boolean; order: number; createdAt: number;
}

interface GateEvent {          // Store "gateEvents", Indizes: day, appId, [appId+day]
  id: string; appId: string; ts: number; day: string;
  type: 'opened'               // „Trotzdem öffnen“ unter dem Limit
      | 'cancelled'            // am Gate abgebrochen (= widerstandener Impuls)
      | 'blocked'              // Limit erreicht, Sperrbildschirm gesehen und verlassen
      | 'override';            // Limit überschrieben (mit Hürde)
  intention?: string;          // „Wofür öffnest du das?“
  reason?: string;             // Begründung beim Überschreiben
  alternativeId?: string;      // vorgeschlagene Scroll-Alternative nach Abbruch
}

interface Routine {            // Store "routines" (genau 2: morning, evening)
  id: 'morning' | 'evening';
  items: { id: string; label: string;
           kind: 'check' | 'dayGoal' | 'startSession' | 'focusOn' | 'reflection' }[];
  reminderTime: string;        // "07:00" – für die iOS-Automation
  noSocialUntil?: string;      // nur morning, z. B. "10:00"
}

interface RoutineRun {         // Store "routineRuns", Index: day
  id: string; routineId: 'morning' | 'evening'; day: string;
  startedAt: number; finishedAt?: number;
  checked: string[];           // erledigte item-IDs
  dayGoal?: string; reflection?: string;
}

interface Alternative {        // Store "alternatives" – Scroll-Ersatz (2-Minuten-Ideen)
  id: string; text: string; enabled: boolean; order: number;
}

// Store "kv": Schlüssel-Wert-Paare
//  settings: { weeklyGoalMin, presets: PomodoroPreset[], defaultPassMinutes,
//              breathSeconds, overrideSentence, overrideWaitSec (60), overrideReasonMinChars,
//              dayStartHour, shortcutsEnabled, shortcutNames{…}, openVia: 'webapp'|'https' }
//  activeTimer: laufender Timer-Zustand (siehe 2.5)
//  onboarding: { done, setupStepsDone[] }
//  meta: { schemaVersion }
interface PomodoroPreset { id: string; name: string; focusMin: number;
  shortBreakMin: number; longBreakMin: number; roundsUntilLong: number; }
```

**Export-Format** (`fokus-backup-YYYY-MM-DD.json`):
`{ app: "fokus", schemaVersion: 1, exportedAt, data: { subjects, tasks, sessions, apps, gateEvents, routines, routineRuns, alternatives, kv } }`.
Export über das Teilen-Menü (`navigator.share` mit Datei → „In Dateien sichern“), sonst Download.
Import über Dateiauswahl, mit Prüfung von App-Kennung und Schema-Version, dann Vorschau
(„X Sessions, Y Fächer …“) und Bestätigung. Standard: vollständig ersetzen, vorher wird automatisch
ein Sicherungs-Export der aktuellen Daten angeboten. Migrationen laufen über `onupgradeneeded` und
eine Migrationsfunktion pro Schema-Version, Importe älterer Versionen laufen durch dieselben Migrationen.

---

## 4. Kurzbefehl-Konzept

### 4.1 Grundidee

Die PWA kann andere Apps weder erkennen noch sperren. iOS kann es: Die **Automation
„App wird geöffnet“** startet einen Kurzbefehl, sobald Instagram & Co. geöffnet werden.
Dieser Kurzbefehl entscheidet in einer Sekunde: Durchlass aktiv → nichts tun. Sonst → Gate in der PWA öffnen.
Die PWA ruft ihrerseits Kurzbefehle über `shortcuts://x-callback-url/run-shortcut` auf und übergibt
Daten als JSON-Text. So bleibt jede Logik (Limits, Zählung, Statistik) in der App, die Kurzbefehle sind
dumm und klein, und Einstellungsänderungen (z. B. Durchlass-Minuten) brauchen kein Umbauen der Kurzbefehle.

### 4.2 Die Kurzbefehle (einmalig einzurichten)

Aktionsnamen auf Deutsch, englischer Name in Klammern. Exakte Bezeichnungen prüfe ich in Phase 3
gegen deine iOS-Version (sie haben sich zwischen iOS-Versionen teils geändert).

**K1 „Fokus Gate“** – wird von jeder App-Automation aufgerufen, Eingabe: App-Kürzel (Text)
1. *Datei aus Ordner abrufen* (Get File from Folder): Ordner „Kurzbefehle“, Pfad `Fokus/pass-[Kurzbefehleingabe].txt`, „Fehler, wenn nicht gefunden“ **aus**
2. *Wenn* (If) Datei *hat einen Wert*:
   1. *Details von Dateien abrufen* (Get Details of Files): **Änderungsdatum**
   2. *Zeit zwischen Daten abrufen* (Get Time Between Dates): von Änderungsdatum bis *Aktuelles Datum*, in **Minuten**
   3. *Zahlen aus Eingabe abrufen* (Get Numbers from Input): aus Datei (Inhalt = erlaubte Minuten)
   4. *Wenn* Zeit *ist kleiner als* Zahl → *Diesen Kurzbefehl stoppen* (Stop This Shortcut)
3. *URLs öffnen* (Open URLs): `webapp://julius33176.github.io/fokus-app/gate/?app=[Kurzbefehleingabe]`
   (Rückfall: `https://…`, siehe 4.5)

**Automation pro App** (Automation → App → Instagram → „Wird geöffnet“ → **Sofort ausführen**, „Bei Ausführung benachrichtigen“ aus):
*Text* `instagram` → *Kurzbefehl ausführen* (Run Shortcut) „Fokus Gate“ mit Eingabe Text. Eine Automation je App.

**K2 „Fokus Durchlass“** – Aufruf aus dem Gate („Trotzdem öffnen“ bzw. nach Überschreiben),
Eingabe JSON `{"app":"instagram","min":10,"open":"instagram://"}`
1. *Wörterbuch aus Eingabe abrufen* (Get Dictionary from Input)
2. *Text*: Wert `min` → *Datei sichern* (Save File): Pfad `Fokus/pass-[app].txt`, „Ziel erfragen“ aus, „Überschreiben“ **an**
3. *URLs öffnen*: Wert `open` → Instagram öffnet sich, die Automation feuert erneut, K1 sieht den frischen Durchlass und lässt dich durch.

**K3 „Fokus Lernen an“** – Eingabe JSON `{"min":25}`: *Fokus festlegen* (Set Focus) „Lernen“ an bis ausgeschaltet → *Timer starten* (Start Timer) mit `min` Minuten. Rücksprung in die PWA über `x-success`.
**K4 „Fokus Lernen aus“**: *Fokus festlegen* „Lernen“ aus (+ Timer beenden, falls die Aktion auf deiner iOS-Version existiert, siehe Grenzen).
**K5 „Fokus Morgen“ / K6 „Fokus Abend“** (Phase 4): Fokus „Morgen“ bzw. „Abend“ an/aus, Eingabe `an`/`aus`.
**Automation „Tageszeit“** (Phase 4): z. B. 07:00 → *Mitteilung anzeigen* „Morgenmodus starten?“ bzw. direkt die PWA unter `/morning` öffnen (was zuverlässiger klappt, testen wir).

### 4.3 Ablauf am Gate

```
Instagram antippen
  └─ Automation „App wird geöffnet“ → K1 „Fokus Gate“ (instagram)
       ├─ Durchlass jünger als X min? → Ende, Instagram bleibt offen
       └─ sonst → PWA öffnet /gate/?app=instagram
             Atempause (Countdown) · „Wofür öffnest du das?“ · heute 3/5 · Limit 5
             ├─ „Lieber nicht“  → Ereignis cancelled → 2-Minuten-Alternative vorschlagen
             ├─ unter Limit: „Trotzdem öffnen“ → Ereignis opened → K2 → Durchlass-Datei → Instagram
             └─ Limit erreicht: Sperrbildschirm → Ereignis blocked
                  └─ „Überschreiben“ (max. 1×/Tag): 60 s warten (Verlassen setzt zurück) →
                     langen Satz abtippen (kein Einfügen) → Grund angeben →
                     Ereignis override (in Statistik sichtbar) → K2 → Instagram
```

### 4.4 Durchlass-Prüfung: gewählte Methode und Alternativen

**Gewählt: Änderungsdatum einer Datei.** K2 schreibt `pass-<app>.txt` neu (Inhalt: erlaubte Minuten),
K1 liest nur das **Änderungsdatum** und vergleicht mit „jetzt“.

| Methode | Bewertung |
|---|---|
| **Änderungsdatum der Datei** | kein Text-Parsing, unabhängig von Sprache/Region/Datumsformat, wenige Aktionen, offline. Durchlass-Dauer steht in der Datei, also aus der App steuerbar. **Gewählt.** |
| Zeitstempel als Text speichern und zurück-parsen | „Datumsangaben aus Eingabe abrufen“ hängt von Region und Format ab → fehleranfällig |
| Unix-Zeit als Zahl speichern | funktioniert, aber mehr Aktionen; **Rückfall**, falls das Änderungsdatum durch iCloud-Sync unzuverlässig wäre |
| Zwischenablage, Notizen, Fokus-Status als Marker | wird überschrieben, langsam oder stört andere Funktionen |
| App Intents im Hintergrund (iOS 26) | sauberste Lösung, aber nur für native Apps → ausgeschlossen |

Voraussetzung: iCloud Drive ist aktiv (Ordner „Kurzbefehle“). Die Einrichtungsanleitung bekommt einen
Testknopf, der K2 mit `"open"` = Rücksprung-URL aufruft und dann zeigt, ob K1 den Durchlass erkennt.

### 4.5 Die entscheidende Unbekannte: Wie kommt man aus Kurzbefehlen in die Web-App?

- Ein normaler `https://`-Link aus *URLs öffnen* oder `x-success` öffnet sich in **Safari**, nicht in der
  installierten Web-App. Safari und Home-Bildschirm-Web-App haben **getrennten Speicher**
  (IndexedDB, localStorage). Ein Gate in Safari sähe also weder Limits noch Zählerstände der App.
- Ab iOS 26 soll das (inoffizielle, nicht von Apple dokumentierte) Schema
  `webapp://julius33176.github.io/fokus-app/…` die **installierte Web-App** öffnen. Berichte dazu
  sind widersprüchlich (funktionierte in einer iOS-26-Beta, später teils nicht).
- Deshalb gibt es schon jetzt die Seite **`/check`** (iOS-Check), mit der du das in 5 Minuten prüfst.

**Plan A (wenn `webapp://` funktioniert):** PWA im Standalone-Modus, Kurzbefehle öffnen sie mit
`webapp://`, `x-success` springt mit `webapp://` zurück. Volle App-Optik, ein Datenspeicher.

**Plan B (wenn nicht): „Safari-Modus“.** Beim Hinzufügen zum Home-Bildschirm „Als Web-App öffnen“
**aus**schalten. Das Symbol öffnet dann Safari, Gate, Rücksprünge und App teilen sich denselben Speicher.
Nachteil: Safari-Leisten sichtbar, `x-success` kann neue Tabs öffnen. Die App funktioniert sonst identisch
(Offline, Export usw.). Variante B2 (Standalone-App + Gate in Safari mit Datenabgleich über die
Zwischenablage) halte ich für zu fehleranfällig und würde ich nur auf deinen Wunsch bauen.

### 4.6 Ergebnis iOS-Check (27.11., iPhone mit iOS 26.6.1)

| Test | Ergebnis |
|---|---|
| Speicher Safari ↔ Web-App | **getrennt** (verschiedene Kennungen) |
| `webapp://…` aus Kurzbefehl, Web-App im Hintergrund (warm) | Web-App kommt nach vorne, **Adresse wird ignoriert** (kein Laden, Seite bleibt wie sie war) |
| `webapp://…` aus Kurzbefehl, Web-App beendet (kalt) | Web-App startet, aber **immer auf der Startseite** (`start_url`), Pfad und `?app=` gehen verloren |
| `shortcuts://` aus der Web-App | funktioniert **ohne Rückfrage**, Text-Eingabe (`input=text`) kommt im Kurzbefehl an |
| `x-success=webapp://…` | springt **zurück in die Web-App**, aber ebenfalls ohne Adresse |

**Folgerung:** Kurzbefehle können die Web-App öffnen und die Web-App kann Kurzbefehle mit Daten starten.
Der umgekehrte Weg (Daten **in** die Web-App) existiert nicht: Die Web-App erfährt nicht, *dass* sie vom
Gate geöffnet wurde und *welche* App gemeint war. Plan A in der ursprünglichen Form geht also nicht.
Entscheidung durch Julius zwischen **A2** und **B** steht aus:

- **A2 „Web-App + Wohin-Abfrage“ (Empfehlung):** Echte Web-App. Jedes Mal, wenn Fokus nach vorne kommt
  (nach ≥ 3 s im Hintergrund), erscheint ein Blatt „Wohin willst du?“ mit großen Knöpfen
  *Instagram · TikTok · YouTube* und *Weiter in Fokus*. Ein Tipp auf die App startet das Gate für genau diese
  App. Kosten: ein zusätzlicher Tipp, auch wenn du Fokus selbst öffnest. Nach einem eigenen
  Kurzbefehl-Aufruf (Fokus an, Timer …) wird das Blatt automatisch unterdrückt. Betrug („falsche App wählen“)
  bringt nichts, weil der Durchlass nur für die gewählte App gilt und genau diese öffnet.
- **B „Safari-Modus“:** wie oben beschrieben, Gate erkennt die App automatisch über die Adresse, kein
  Zusatz-Tipp. Kosten: Safari-Leisten überall, jeder Gate-Aufruf öffnet einen neuen Safari-Tab.

---

## 5. Technische Grenzen von iOS-PWAs (ehrlich)

| Thema | Geht | Geht nicht | Wie wir es lösen |
|---|---|---|---|
| Andere Apps sperren | – | PWA kann keine App erkennen/sperren; Screen-Time-API nur für native Apps | Weiche Schranke: Kurzbefehl-Automation + Gate. Harte Schranke: Bildschirmzeit-Limits mit Code der Vertrauensperson |
| Umgehbarkeit | – | Automationen lassen sich in der Kurzbefehle-App jederzeit ausschalten; die Kurzbefehle-App selbst darf **nicht** per Bildschirmzeit gesperrt werden, sonst bricht das Gate | ehrlich benennen; die harte Grenze bleibt Bildschirmzeit |
| App-Öffnung erkennen | Automation „Wird geöffnet“ feuert auch beim App-Wechsel | Automation feuert erst, wenn die App schon sichtbar ist (kurzes Aufblitzen) | Durchlass-Fenster verhindert Mehrfachzählung und Schleifen |
| Web-App aus Kurzbefehl öffnen | vermutlich ab iOS 26 per `webapp://` | normale https-Links landen in Safari | iOS-Check, Plan A/B (4.5) |
| Speicher | IndexedDB, mehrere hundert MB | Safari und Web-App teilen keinen Speicher; Löschen der Web-App vom Home-Bildschirm löscht alle Daten | Export/Import, `storage.persist()`. Laut WebKit gilt die 7-Tage-Löschregel nicht für Home-Bildschirm-Web-Apps |
| Benachrichtigungen | Web Push ab iOS 16.4 | braucht einen Push-Server (Backend) → ausgeschlossen; lokal geplante Mitteilungen gibt es im Web nicht | Timer-Ende: Kurzbefehl startet parallel einen iOS-Timer. Morgen/Abend: iOS-Automation „Tageszeit“ |
| Timer im Hintergrund | – | JavaScript pausiert im Hintergrund | Zeitstempel-Rechnung (2.5) + iOS-Timer |
| Pause/Abbruch und iOS-Timer | Timer starten | Ob es eine Aktion zum Stoppen/Pausieren eines laufenden iOS-Timers gibt, ist unklar | wird in Phase 4 getestet; sonst: Hinweis, den Timer bei Abbruch in der Uhr-App zu stoppen |
| Fokus-Modi | per Kurzbefehl an/aus | PWA kann Fokus nicht direkt setzen oder abfragen | Kurzbefehle K3–K6 |
| Kurzbefehle installieren | – | Automationen lassen sich nicht teilen oder importieren; iCloud-Links für Kurzbefehle kann ich nicht erzeugen | Schritt-für-Schritt-Anleitung in der App mit Testknopf je Schritt |
| `shortcuts://` aus der Web-App | funktioniert über URL-Schema | evtl. Rückfrage „In Kurzbefehle öffnen?“ | wird im iOS-Check geprüft |
| Installation | „Zum Home-Bildschirm“, ab iOS 26 standardmäßig als Web-App | kein Installations-Dialog wie bei Android | Onboarding-Anleitung mit Bildern |
| Bildschirm anlassen | Wake Lock ab iOS 18.4 | – | optional im Timer |
| Haptik | – | `navigator.vibrate` gibt es auf iOS nicht | nur visuelles Feedback (Idee in IDEEN.md) |
| Updates | Service Worker | iOS lädt Updates manchmal erst beim zweiten Start | „Neue Version – neu laden“-Hinweis |

---

## 6. iOS-Check (von Julius zu testen, gleich nach Phase 0)

Seite `https://julius33176.github.io/fokus-app/check/`. Ablauf und Testkurzbefehle stehen auf der Seite.
1. Seite in Safari öffnen → zum Home-Bildschirm hinzufügen („Als Web-App öffnen“ an).
2. Speicher-Test: Kennung in Safari und in der Web-App vergleichen (erwartet: verschieden).
3. Kurzbefehl „Fokus Test A“ mit *URLs öffnen* `webapp://julius33176.github.io/fokus-app/check/?via=webapp`
   → öffnet sich die **Web-App** (Anzeige „Standalone“, „via=webapp“)?
4. Aus der Web-App „Fokus Test B“ per `shortcuts://` starten → Rückfrage-Dialog? Kommt `x-success`
   mit `webapp://` in die Web-App zurück?
5. Ergebnisse mit dem Knopf „Ergebnis kopieren“ in den Chat einfügen.

---

## 7. Phasen und Teilschritte

**Phase 0 – Plan:** PLAN/PROGRESS/IDEEN, Vite-Grundgerüst, Deploy-Workflow, iOS-Check-Seite.

**Phase 1 – Design:** 3 Designrichtungen (Startscreen + Timer) als umschaltbare Vorschau, statische Beispieldaten.
Skills: impeccable, apple-design, (prototype/frontend-design nicht verfügbar).

**Phase 2 – Kern:** DB-Schicht + Migrationen → Fächer/Aufgaben → Timer-Automat (+ Tests) →
Timer-Bildschirm mit Ring, Pomodoro-Presets, Pausen, Ablenkungs-Knopf → Bewertung nach Session →
Statistik-Grundgerüst → Export/Import → Service Worker/Offline. Skills: mobile-native, animate, gestures.

**Phase 3 – Gate und Limits:** App-Verwaltung (Limits, Durchlass, URL-Schema) → Gate-Seite →
Sperrbildschirm + Überschreib-Hürde → Scroll-Ersatz → Einrichtungsanleitung K1/K2 + Automationen mit
Testknöpfen → Bildschirmzeit-Anleitung (Vertrauensperson). Danach Test durch Julius.

**Phase 4 – Morgen/Abend und Fokus-Steuerung:** Routinen (anpassbare Checklisten), Tagesziel,
„kein Social Media bis“, Tagesrückblick, K3–K6 + Tageszeit-Automationen, Modus-Farbwelten. Skill: choreograph.

**Phase 5 – Feinschliff:** volle Statistik (Heatmap, Wochenziel, Streak, Apps), Animationen,
Randfälle, Offline-Härtung, Barrierefreiheit (VoiceOver, Kontrast, Dynamic Type), Installierbarkeit,
README. Skills: break-ui, emil-design-eng, improve-animations (review-animations ist nicht verfügbar).

---

## 8. Entscheidungen und offene Fragen

Beantwortet (27.11.):
1. GitHub Pages: aktiv, Source GitHub Actions, Environment `github-pages` ohne Branch-Beschränkung. ✓
2. iOS-Version: **26.6.1**. ✓
3. iOS-Check: siehe 4.6. ✓
4. Tagesgrenze: **04:00**. ✓
5. Gate-Apps: **Instagram, TikTok, YouTube**. ✓

Mit Annahme (Julius kann widersprechen):
6. Überschreiben: Antwort offen gelassen → **insgesamt 1× pro Tag über alle Apps** (strengere Variante).
7. Streak: „30 min“ → Ein Tag zählt bei **mindestens 30 min Fokuszeit am Tag (Summe)**, damit auch
   zwei 25-min-Pomodoros zählen.

Offen:
8. **Anbindung des Gates: A2 (Web-App + Wohin-Abfrage) oder B (Safari-Modus)?** Siehe 4.6.

---

## 9. Verfügbare Skills (Stand Phase 0)

Verfügbar: impeccable, apple-design, mobile-native, animate, choreograph, gestures, break-ui,
emil-design-eng, improve-animations, find-animation-opportunities, animation-performance.
Nicht verfügbar: prototype, frontend-design, pick-ui-library, review-animations (Ersatz: improve-animations).
