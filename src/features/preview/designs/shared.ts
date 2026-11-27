/** Uhrzeit, zu der die Session endet, z. B. "14:32". */
export function endTimeLabel(remainingSec: number): string {
  return new Date(Date.now() + remainingSec * 1000).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
