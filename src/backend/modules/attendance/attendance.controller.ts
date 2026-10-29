import { ValidationError } from '../../shared/errors/app-error.ts'
import { asObject, readOptionalString, readRequiredString } from '../../shared/http/parsers.ts'
import type { HttpRequest, HttpResponse } from '../../shared/http/http.types.ts'
import type { AttendanceService } from './attendance.service.ts'
import type { AttendanceStatus, RecordAttendanceInput } from './attendance.types.ts'

const STATUSES: AttendanceStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'LEAVE']

const parseStatus = (value: string | undefined): AttendanceStatus | undefined => {
  if (value === undefined) {
    return undefined
  }
  if (!STATUSES.includes(value as AttendanceStatus)) {
    throw new ValidationError('status must be one of PRESENT, LATE, ABSENT, LEAVE')
  }
  return value as AttendanceStatus
}

export class AttendanceController {
  private readonly service: AttendanceService

  constructor(service: AttendanceService) {
    this.service = service
  }

  record = async (request: HttpRequest): Promise<HttpResponse> => {
    const body = asObject(request.body)
    const input: RecordAttendanceInput = {
      employeeId: readRequiredString(body, 'employeeId'),
      employeeName: readRequiredString(body, 'employeeName'),
      departmentId: readOptionalString(body, 'departmentId'),
      workDate: readRequiredString(body, 'workDate'),
      checkInAt: readOptionalString(body, 'checkInAt'),
      checkOutAt: readOptionalString(body, 'checkOutAt'),
      status: parseStatus(readOptionalString(body, 'status')),
      note: readOptionalString(body, 'note'),
    }

    const record = await this.service.recordAttendance(input)
    return { status: 201, body: { data: record } }
  }

  list = async (request: HttpRequest): Promise<HttpResponse> => {
    const records = await this.service.listRecords({
      employeeId: request.query.get('employeeId') ?? undefined,
      from: request.query.get('from') ?? undefined,
      to: request.query.get('to') ?? undefined,
    })
    return { status: 200, body: { data: records } }
  }
}
