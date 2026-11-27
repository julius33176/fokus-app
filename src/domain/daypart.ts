// Tageszeit → Farbstimmung und Begrüßung (Julius' Wunsch vom 27.11.).

export type Daypart = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'latenight'

export function daypartOf(date: Date): Daypart {
  const h = date.getHours()
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 12) return 'morning'
  if (h >= 12 && h < 17) return 'afternoon'
  if (h >= 17 && h < 21) return 'evening'
  if (h >= 21 || h < 1) return 'night'
  return 'latenight' // 01–05
}

/** Palette im Himmel: Spätnacht nutzt die Nacht-Palette. */
export type Palette = 'dawn' | 'morning' | 'afternoon' | 'evening' | 'night' | 'fokus' | 'morgen' | 'abend'

export function paletteOfDaypart(d: Daypart): Palette {
  return d === 'latenight' ? 'night' : d
}

const GREETINGS: Record<Daypart, string[]> = {
  dawn: ['Früh dran, {name}. Der Tag gehört dir.', 'Guten Morgen, {name}. Ruhiger Start?'],
  morning: ['Guten Morgen, {name}. Bereit für die erste Runde?', 'Frischer Kopf, {name}. Gute Zeit für Schweres.'],
  afternoon: ['Hallo {name}. Noch eine Runde vor dem Abend?', 'Zweite Tageshälfte, {name}. Weiter geht’s.'],
  evening: ['Guten Abend, {name}. Noch eine Runde?', 'Abendsession, {name}?'],
  night: ['Bereit für eine Nachtsession, {name}?', 'Späte Runde, {name}? Dann richtig fokussiert.'],
  latenight: ['Noch wach, {name}? Schlaf zählt auch zum Lernen.', 'Mitten in der Nacht, {name}. Eine kurze Runde, dann Schlaf?'],
}

/** Einfacher, stabiler Hash, damit pro Tag dieselbe Variante kommt. */
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function greeting(d: Daypart, name: string, dayKey: string): string {
  const list = GREETINGS[d]
  const text = list[hash(dayKey + d) % list.length]
  const trimmed = name.trim()
  if (!trimmed) {
    // Ohne Namen: ", {name}" bzw. " {name}" sauber entfernen
    return text.replace(/,? \{name\}/g, '').replace(/\{name\}/g, '')
  }
  return text.replace(/\{name\}/g, trimmed)
}
