import type { DateRange } from './attendance-report.ts'

const DAY_MS = 86_400_000

const toUtcMs = (date: string): number => {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

const fromUtcMs = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

export function daysBetween(range: DateRange): number {
  return (toUtcMs(range.endDate) - toUtcMs(range.startDate)) / DAY_MS
}

// Both ends inclusive. Callers must bound the range first (see the query parser).
export function eachDate(range: DateRange): string[] {
  const dates: string[] = []
  for (let ms = toUtcMs(range.startDate); ms <= toUtcMs(range.endDate); ms += DAY_MS) {
    dates.push(fromUtcMs(ms))
  }
  return dates
}

export function isWeekend(date: string): boolean {
  const day = new Date(toUtcMs(date)).getUTCDay()
  return day === 0 || day === 6
}

export function todayIn(timeZone: string, now: Date = new Date()): string {
  // The en-CA locale formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

// Postgres reads a numeric offset such as '+07:00' with the opposite sign to Intl, which would
// silently put events on the wrong day, so only named zones (Asia/Ho_Chi_Minh, Etc/GMT-7) pass.
export function isValidTimeZone(value: string): boolean {
  if (/^[+\-\d]/.test(value)) {
    return false
  }
  try {
    new Intl.DateTimeFormat('en', { timeZone: value })
    return true
  } catch {
    return false
  }
}
