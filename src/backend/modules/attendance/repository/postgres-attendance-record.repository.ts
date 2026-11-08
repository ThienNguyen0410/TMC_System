import type { Pool } from 'pg'
import type { AttendanceEventType } from '../domain/attendance-event.ts'
import type { AttendanceLocation } from '../domain/attendance-location.ts'
import type { AttendanceRecord } from '../domain/attendance-record.ts'
import type {
  AttendanceRecordRepository,
  CreateAttendanceRecordInput,
} from './attendance-record.repository.ts'

interface AttendanceRecordRow {
  id: string
  employee_id: string
  gate_id: string | null
  event_type: AttendanceEventType
  recorded_at: Date
  source: string
  locations?: unknown
}

const RECORD_COLUMNS = `id::text AS id,
       employee_id::text AS employee_id,
       gate_id::text AS gate_id,
       event_type,
       recorded_at,
       source`

const parseJson = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

const toLocation = (value: unknown): AttendanceLocation | null => {
  const parsed = parseJson(value)

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return null
  }

  const candidate = parsed as Record<string, unknown>
  const latitude = candidate.latitude
  const longitude = candidate.longitude
  const accuracy = candidate.accuracy

  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    typeof accuracy !== 'number'
  ) {
    return null
  }

  return { latitude, longitude, accuracy }
}

const toRecord = (
  row: AttendanceRecordRow,
  fallbackLocation: AttendanceLocation | null,
): AttendanceRecord => ({
  id: row.id,
  employeeId: row.employee_id,
  gateId: row.gate_id,
  eventType: row.event_type,
  recordedAt: row.recorded_at,
  source: row.source,
  location: toLocation(row.locations) ?? fallbackLocation,
})

export class PostgresAttendanceRecordRepository implements AttendanceRecordRepository {
  private readonly pool: Pool
  private locationsColumnProbe: Promise<boolean> | null = null

  constructor(pool: Pool) {
    this.pool = pool
  }

  async findLatestByEmployeeId(employeeId: string): Promise<AttendanceRecord | null> {
    const hasLocations = await this.hasLocationsColumn()
    const columns = hasLocations ? `${RECORD_COLUMNS}, locations` : RECORD_COLUMNS

    const result = await this.pool.query<AttendanceRecordRow>(
      `SELECT ${columns}
       FROM attendance.attendance_records
       WHERE employee_id = $1
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1`,
      [employeeId],
    )

    const row = result.rows[0]
    return row ? toRecord(row, null) : null
  }

  async create(input: CreateAttendanceRecordInput): Promise<AttendanceRecord> {
    const hasLocations = await this.hasLocationsColumn()

    const columns = ['employee_id', 'gate_id', 'event_type', 'recorded_at', 'source']
    const values: unknown[] = [
      input.employeeId,
      input.gateId,
      input.eventType,
      input.recordedAt,
      input.source,
    ]

    if (hasLocations) {
      columns.push('locations')
      values.push(JSON.stringify(input.location ?? {}))
    }

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')
    const returningColumns = hasLocations ? `${RECORD_COLUMNS}, locations` : RECORD_COLUMNS

    const result = await this.pool.query<AttendanceRecordRow>(
      `INSERT INTO attendance.attendance_records (${columns.join(', ')})
       VALUES (${placeholders})
       RETURNING ${returningColumns}`,
      values,
    )

    return toRecord(result.rows[0], input.location)
  }

  private async hasLocationsColumn(): Promise<boolean> {
    if (!this.locationsColumnProbe) {
      this.locationsColumnProbe = this.pool
        .query<{ exists: boolean }>(
          `SELECT EXISTS (
             SELECT 1
             FROM information_schema.columns
             WHERE table_schema = 'attendance'
               AND table_name = 'attendance_records'
               AND column_name = 'locations'
           ) AS exists`,
        )
        .then((result) => result.rows[0]?.exists ?? false)
        .catch(() => false)
    }

    return this.locationsColumnProbe
  }
}
