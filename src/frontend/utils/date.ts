import dayjs, { type Dayjs } from 'dayjs'

export function formatDisplayDate(value: string): string {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('ddd, DD MMM YYYY') : value
}

export function formatShortDate(value: string): string {
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('DD MMM') : value
}

export function formatLongDate(value: Dayjs = dayjs()): string {
  return value.format('dddd, DD MMMM YYYY')
}

export function formatTime(value: string | null): string {
  return value ?? '—'
}

export function formatWorkingHours(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(2)} h`
}

export function todayIso(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function getGreeting(date: Dayjs = dayjs()): string {
  const hour = date.hour()
  if (hour < 12) {
    return 'Good morning'
  }
  if (hour < 18) {
    return 'Good afternoon'
  }
  return 'Good evening'
}

export function formatClock(value: Date): string {
  return dayjs(value).format('HH:mm:ss')
}

export function formatKioskDate(value: Date): string {
  return dayjs(value).format('dddd, DD MMMM YYYY')
}

export function isDateWithinRange(date: string, range: [Dayjs, Dayjs] | null): boolean {
  if (!range) {
    return true
  }
  const current = dayjs(date)
  const [start, end] = range
  return !current.isBefore(start, 'day') && !current.isAfter(end, 'day')
}
