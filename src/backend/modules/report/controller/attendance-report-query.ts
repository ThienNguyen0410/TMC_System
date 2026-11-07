import { ValidationError } from '../../../shared/errors/app-error.ts'
import {
  ATTENDANCE_STATUSES,
  type AttendanceReportFilter,
  type AttendanceStatus,
} from '../domain/attendance-report.ts'
import { daysBetween, isValidIsoDate } from '../domain/report-dates.ts'

const MAX_RANGE_DAYS = 366

// An empty value counts as missing.
const read = (query: URLSearchParams, name: string): string | undefined =>
  query.get(name)?.trim() || undefined

const readDate = (query: URLSearchParams, name: string): string | undefined => {
  const value = read(query, name)
  if (value !== undefined && !isValidIsoDate(value)) {
    throw new ValidationError(`${name} must be a valid date in YYYY-MM-DD format`)
  }
  return value
}

export function parseAttendanceReportQuery(
  query: URLSearchParams,
  today: string,
): AttendanceReportFilter {
  const date = readDate(query, 'date')
  const startDate = readDate(query, 'startDate')
  const endDate = readDate(query, 'endDate')
  const status = read(query, 'status')

  if (date !== undefined && (startDate !== undefined || endDate !== undefined)) {
    throw new ValidationError('Use either date or startDate/endDate, not both')
  }
  if ((startDate === undefined) !== (endDate === undefined)) {
    throw new ValidationError('startDate and endDate must be provided together')
  }
  if (status !== undefined && !ATTENDANCE_STATUSES.includes(status as AttendanceStatus)) {
    throw new ValidationError(`status must be one of: ${ATTENDANCE_STATUSES.join(', ')}`)
  }

  const range = {
    startDate: startDate ?? date ?? today,
    endDate: endDate ?? date ?? today,
  }
  if (range.startDate > range.endDate) {
    throw new ValidationError('startDate must not be after endDate')
  }
  if (daysBetween(range) + 1 > MAX_RANGE_DAYS) {
    throw new ValidationError(`Date range cannot exceed ${MAX_RANGE_DAYS} days`)
  }

  return status === undefined ? range : { ...range, status: status as AttendanceStatus }
}
