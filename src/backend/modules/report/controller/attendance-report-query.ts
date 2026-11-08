import { z } from 'zod'
import { ValidationError } from '../../../shared/errors/app-error.ts'
import { ATTENDANCE_STATUSES, type AttendanceReportFilter } from '../domain/attendance-report.ts'
import { daysBetween } from '../domain/report-dates.ts'

const MAX_RANGE_DAYS = 366

// An empty or blank value counts as missing.
const blankAsMissing = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

const dateParam = (name: string) => {
  const message = `${name} must be a valid date in YYYY-MM-DD format`
  return z.preprocess(
    blankAsMissing,
    z.string({ error: message }).trim().pipe(z.iso.date(message)).optional(),
  )
}

export const attendanceReportQuerySchema = z
  .object({
    date: dateParam('date'),
    startDate: dateParam('startDate'),
    endDate: dateParam('endDate'),
    status: z.preprocess(
      blankAsMissing,
      z.enum(ATTENDANCE_STATUSES, { error: `status must be one of: ${ATTENDANCE_STATUSES.join(', ')}` }).optional(),
    ),
  })
  .superRefine(({ date, startDate, endDate }, context) => {
    const fail = (message: string) => context.addIssue({ code: 'custom', message })

    if (date !== undefined && (startDate !== undefined || endDate !== undefined)) {
      fail('Use either date or startDate/endDate, not both')
    } else if ((startDate === undefined) !== (endDate === undefined)) {
      fail('startDate and endDate must be provided together')
    } else if (startDate !== undefined && endDate !== undefined) {
      if (startDate > endDate) {
        fail('startDate must not be after endDate')
      } else if (daysBetween({ startDate, endDate }) + 1 > MAX_RANGE_DAYS) {
        fail(`Date range cannot exceed ${MAX_RANGE_DAYS} days`)
      }
    }
  })

// No date at all means today. `today` is a parameter so the default stays testable.
export function parseAttendanceReportQuery(query: unknown, today: string): AttendanceReportFilter {
  const parsed = attendanceReportQuerySchema.safeParse(query)

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid report query')
  }

  const { date, startDate, endDate, status } = parsed.data
  const range = { startDate: startDate ?? date ?? today, endDate: endDate ?? date ?? today }

  return status === undefined ? range : { ...range, status }
}
