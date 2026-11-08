import type { AttendanceEmployee } from '../domain/attendance-employee.ts'

export interface EmployeeRepository {
  findById(employeeId: string): Promise<AttendanceEmployee | null>
}
