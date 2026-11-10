import type { AttendanceRecord, AttendanceStatus } from '../types/attendance'
import { authorizedFetch, isRecord, readErrorMessage } from './auth.api'

export interface ReportFilter {
  startDate: string
  endDate: string
  status?: AttendanceStatus
}

// A row of GET /api/reports/attendance.
interface ReportRowPayload {
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

function toRecord(row: ReportRowPayload): AttendanceRecord {
  return {
    id: `${row.employeeId}-${row.date}`,
    employeeId: row.employeeId,
    employeeName: row.fullName,
    username: row.username,
    department: row.department,
    date: row.date,
    checkIn: row.checkIn,
    checkOut: row.checkOut,
    status: row.status,
    workingHours: row.workingHours,
  }
}

async function requestReport(
  path: string,
  filter: ReportFilter,
  signal?: AbortSignal,
): Promise<Response> {
  const query = new URLSearchParams({ startDate: filter.startDate, endDate: filter.endDate })
  if (filter.status) {
    query.set('status', filter.status)
  }

  let response: Response
  try {
    response = await authorizedFetch(`${path}?${query.toString()}`, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new Error('Unable to connect to the report server.')
  }

  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null)
    throw new Error(readErrorMessage(payload) ?? 'The report request failed. Please try again.')
  }

  return response
}

export async function fetchAttendanceReport(
  filter: ReportFilter,
  signal?: AbortSignal,
): Promise<AttendanceRecord[]> {
  return fetchReportRecords('/api/reports/attendance', filter, signal)
}

export async function fetchMyAttendance(
  filter: ReportFilter,
  signal?: AbortSignal,
): Promise<AttendanceRecord[]> {
  return fetchReportRecords('/api/reports/attendance/me', filter, signal)
}

async function fetchReportRecords(
  path: string,
  filter: ReportFilter,
  signal?: AbortSignal,
): Promise<AttendanceRecord[]> {
  const response = await requestReport(path, filter, signal)
  const payload: unknown = await response.json().catch(() => null)

  if (!isRecord(payload) || !isRecord(payload.data) || !Array.isArray(payload.data.records)) {
    throw new Error('The report server returned an invalid response.')
  }

  return (payload.data.records as ReportRowPayload[]).map(toRecord)
}

export async function downloadAttendanceReportCsv(filter: ReportFilter): Promise<void> {
  const response = await requestReport('/api/reports/attendance/export', filter)
  const blob = await response.blob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `tmc-attendance-report-${filter.startDate}_${filter.endDate}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Revoke after the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
