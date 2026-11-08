import type { Pool } from 'pg'
import type { AttendanceEmployee } from '../domain/attendance-employee.ts'
import type { EmployeeRepository } from './employee.repository.ts'

interface EmployeeRow {
  id: string
  employee_code: string
  full_name: string
  department: string | null
}

export class PostgresEmployeeRepository implements EmployeeRepository {
  private readonly pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  async findById(employeeId: string): Promise<AttendanceEmployee | null> {
    const result = await this.pool.query<EmployeeRow>(
      `SELECT id::text AS id,
              employee_code,
              full_name,
              department
       FROM "user".employees
       WHERE id = $1
       LIMIT 1`,
      [employeeId],
    )

    const row = result.rows[0]
    if (!row) {
      return null
    }

    return {
      id: row.id,
      employeeCode: row.employee_code,
      fullName: row.full_name,
      department: row.department,
    }
  }
}
