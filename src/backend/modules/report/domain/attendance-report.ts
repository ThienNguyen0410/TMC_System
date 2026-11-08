export const ATTENDANCE_STATUSES = ['present', 'late', 'absent', 'incomplete'] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export interface ReportEmployee {
  id: string
  fullName: string
  username: string
  department: string
  isActive: boolean
}

// One employee on one local day. Dates are YYYY-MM-DD and times HH:mm:ss, both in the report time zone.
export interface DailyActivity {
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
}

export interface DateRange {
  startDate: string
  endDate: string
}

export interface AttendanceReportFilter extends DateRange {
  status?: AttendanceStatus
}

export interface AttendanceReportRow {
  employeeId: string
  fullName: string
  username: string
  department: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: AttendanceStatus
  workingHours: number | null
}

// lateAfter must be HH:mm:ss so a plain string comparison is a time comparison.
export function classifyAttendance(
  checkIn: string | null,
  checkOut: string | null,
  lateAfter: string,
): AttendanceStatus {
  if (checkIn === null && checkOut === null) {
    return 'absent'
  }
  if (checkIn === null || checkOut === null || checkOut < checkIn) {
    return 'incomplete'
  }
  return checkIn > lateAfter ? 'late' : 'present'
}

const toSeconds = (time: string): number => {
  const [hours, minutes, seconds] = time.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds
}

// shortcut: a shift that ends after midnight yields null, upgrade when night shifts exist.
export function workingHours(checkIn: string | null, checkOut: string | null): number | null {
  if (checkIn === null || checkOut === null) {
    return null
  }
  const seconds = toSeconds(checkOut) - toSeconds(checkIn)
  return seconds < 0 ? null : Math.round((seconds / 3600) * 100) / 100
}
