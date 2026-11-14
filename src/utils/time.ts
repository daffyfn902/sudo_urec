export const OPEN_HOUR = 6
export const CLOSE_HOUR = 23

export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display} ${suffix}`
}

export function formatHourRange(start: number, end: number): string {
  return `${formatHour(start)} – ${formatHour(end)}`
}

export function getSimulatedCurrentHour(): number {
  const real = new Date().getHours()
  if (real < OPEN_HOUR) return OPEN_HOUR
  if (real >= CLOSE_HOUR) return CLOSE_HOUR - 1
  return real
}

export function hoursInDay(): number[] {
  return Array.from({ length: CLOSE_HOUR - OPEN_HOUR }, (_, i) => OPEN_HOUR + i)
}

export function todayISODate(): string {
  // Local date, not UTC: toISOString() would roll over to tomorrow in the evening (US time zones)
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function formatDisplayDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Local date as YYYY-MM-DD (toISOString would shift to UTC and roll over to tomorrow in the evening). */
export function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function shiftISODate(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}
