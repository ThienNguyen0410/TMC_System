import type { Pool } from 'pg'
import type { DailyActivity, DateRange, ReportEmployee } from '../domain/attendance-report.ts'
import type { AttendanceReportRepository } from './attendance-report.repository.ts'

export class PostgresAttendanceReportRepository implements AttendanceReportRepository {
  private readonly pool: Pool
  private readonly timeZone: string

  constructor(pool: Pool, timeZone: string) {
    this.pool = pool
    this.timeZone = timeZone
  }

  async listEmployees(): Promise<ReportEmployee[]> {
    const result = await this.pool.query<ReportEmployee>(
      `SELECT id::text AS id,
              full_name AS "fullName",
              username,
              COALESCE(department, '') AS department,
              is_active AS "isActive"
       FROM "user".users`,
    )
    return result.rows
  }

  async listDailyActivity(range: DateRange): Promise<DailyActivity[]> {
    // The range is half-open on the raw column so the (employee_id, recorded_at) index applies.
    // $3 is the report time zone: it decides which local day an event belongs to.
    const result = await this.pool.query<DailyActivity>(
      `SELECT employee_id::text AS "employeeId",
              to_char(recorded_at AT TIME ZONE $3::text, 'YYYY-MM-DD') AS date,
              to_char(MIN(recorded_at AT TIME ZONE $3::text) FILTER (WHERE event_type = 'CHECK_IN'),
                      'HH24:MI:SS') AS "checkIn",
              to_char(MAX(recorded_at AT TIME ZONE $3::text) FILTER (WHERE event_type = 'CHECK_OUT'),
                      'HH24:MI:SS') AS "checkOut"
       FROM attendance.attendance_records
       WHERE recorded_at >= ($1::date)::timestamp AT TIME ZONE $3::text
         AND recorded_at < (($2::date + 1))::timestamp AT TIME ZONE $3::text
       GROUP BY employee_id, 2`,
      [range.startDate, range.endDate, this.timeZone],
    )
    return result.rows
  }
}
