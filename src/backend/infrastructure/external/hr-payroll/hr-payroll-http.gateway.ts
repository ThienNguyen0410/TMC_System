import type { HRPayrollPort } from '../../../modules/attendance/attendance.ports.ts'
import type { AttendanceRecordDto } from '../../../modules/attendance/attendance.types.ts'

interface HRPayrollAttendancePayload {
  externalRecordId: string
  employeeId: string
  workDate: string
  checkInAt: string | null
  checkOutAt: string | null
  status: string
  note: string | null
}

export class HttpHRPayrollGateway implements HRPayrollPort {
  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(baseUrl: string, apiKey = '') {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }

  async sendAttendance(record: AttendanceRecordDto): Promise<void> {
    const payload: HRPayrollAttendancePayload = {
      externalRecordId: record.id,
      employeeId: record.employeeId,
      workDate: record.workDate,
      checkInAt: record.checkInAt,
      checkOutAt: record.checkOutAt,
      status: record.status,
      note: record.note,
    }

    const response = await fetch(`${this.baseUrl}/attendance-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HR/Payroll responded with status ${response.status}`)
    }
  }
}
