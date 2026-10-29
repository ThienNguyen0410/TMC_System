import { randomUUID } from 'node:crypto'
import { ValidationError } from '../../shared/errors/app-error.ts'
import type {
  AttendanceRecordDto,
  AttendanceStatus,
  RecordAttendanceInput,
} from './attendance.types.ts'

interface AttendanceDomainProps {
  id: string
  employeeId: string
  employeeName: string
  departmentId: string | null
  workDate: string
  checkInAt: Date | null
  checkOutAt: Date | null
  status: AttendanceStatus
  note: string | null
  createdAt: Date
  syncedToPayrollAt: Date | null
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'LEAVE']

const parseOptionalDateTime = (value: string | undefined, field: string): Date | null => {
  if (value === undefined || value.trim() === '') {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError(`${field} must be a valid date-time`)
  }
  return parsed
}

export class AttendanceDomain {
  readonly id: string
  readonly employeeId: string
  readonly employeeName: string
  readonly departmentId: string | null
  readonly workDate: string
  readonly checkInAt: Date | null
  readonly checkOutAt: Date | null
  readonly status: AttendanceStatus
  readonly note: string | null
  readonly createdAt: Date
  readonly syncedToPayrollAt: Date | null

  private constructor(props: AttendanceDomainProps) {
    this.id = props.id
    this.employeeId = props.employeeId
    this.employeeName = props.employeeName
    this.departmentId = props.departmentId
    this.workDate = props.workDate
    this.checkInAt = props.checkInAt
    this.checkOutAt = props.checkOutAt
    this.status = props.status
    this.note = props.note
    this.createdAt = props.createdAt
    this.syncedToPayrollAt = props.syncedToPayrollAt
  }

  static record(input: RecordAttendanceInput, now = new Date()): AttendanceDomain {
    const employeeId = input.employeeId?.trim()
    const employeeName = input.employeeName?.trim()
    const workDate = input.workDate?.trim()

    if (!employeeId) {
      throw new ValidationError('employeeId is required')
    }
    if (!employeeName) {
      throw new ValidationError('employeeName is required')
    }
    if (!workDate || !DATE_PATTERN.test(workDate) || Number.isNaN(new Date(`${workDate}T00:00:00.000Z`).getTime())) {
      throw new ValidationError('workDate must be a valid date in YYYY-MM-DD format')
    }

    const checkInAt = parseOptionalDateTime(input.checkInAt, 'checkInAt')
    const checkOutAt = parseOptionalDateTime(input.checkOutAt, 'checkOutAt')

    if (checkInAt && checkOutAt && checkOutAt <= checkInAt) {
      throw new ValidationError('checkOutAt must be after checkInAt')
    }
    if (input.status !== undefined && !STATUSES.includes(input.status)) {
      throw new ValidationError('status must be one of PRESENT, LATE, ABSENT, LEAVE')
    }

    return new AttendanceDomain({
      id: randomUUID(),
      employeeId,
      employeeName,
      departmentId: input.departmentId?.trim() || null,
      workDate,
      checkInAt,
      checkOutAt,
      status: input.status ?? 'PRESENT',
      note: input.note?.trim() || null,
      createdAt: now,
      syncedToPayrollAt: null,
    })
  }

  markSynced(syncedAt: Date): AttendanceDomain {
    return new AttendanceDomain({
      id: this.id,
      employeeId: this.employeeId,
      employeeName: this.employeeName,
      departmentId: this.departmentId,
      workDate: this.workDate,
      checkInAt: this.checkInAt,
      checkOutAt: this.checkOutAt,
      status: this.status,
      note: this.note,
      createdAt: this.createdAt,
      syncedToPayrollAt: syncedAt,
    })
  }

  toDto(): AttendanceRecordDto {
    return {
      id: this.id,
      employeeId: this.employeeId,
      employeeName: this.employeeName,
      departmentId: this.departmentId,
      workDate: this.workDate,
      checkInAt: this.checkInAt?.toISOString() ?? null,
      checkOutAt: this.checkOutAt?.toISOString() ?? null,
      status: this.status,
      note: this.note,
      createdAt: this.createdAt.toISOString(),
      syncedToPayrollAt: this.syncedToPayrollAt?.toISOString() ?? null,
    }
  }
}
