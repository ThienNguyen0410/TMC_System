export type AttendanceEventType = 'CHECK_IN' | 'CHECK_OUT'

export function determineNextEventType(
  latestEventType: AttendanceEventType | null,
): AttendanceEventType {
  return latestEventType === 'CHECK_IN' ? 'CHECK_OUT' : 'CHECK_IN'
}
