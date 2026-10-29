import type { AttendanceStatus } from '../types/attendance'

interface AttendanceStatusMeta {
  label: string
  tagColor: string
  order: number
}

export const attendanceStatusMeta: Record<AttendanceStatus, AttendanceStatusMeta> = {
  present: { label: 'Present', tagColor: 'green', order: 0 },
  late: { label: 'Late', tagColor: 'orange', order: 1 },
  incomplete: { label: 'Incomplete', tagColor: 'default', order: 2 },
  absent: { label: 'Absent', tagColor: 'red', order: 3 },
}

export const attendanceStatusOptions = (
  Object.keys(attendanceStatusMeta) as AttendanceStatus[]
).map((status) => ({
  value: status,
  label: attendanceStatusMeta[status].label,
}))

export function getStatusOrder(status: AttendanceStatus): number {
  return attendanceStatusMeta[status].order
}
