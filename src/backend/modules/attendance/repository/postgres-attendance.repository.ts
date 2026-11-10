import type { Pool } from 'pg'
import type {
  AttendanceEmployee,
  AttendanceEventType,
  AttendanceRecord,
  LatestAttendanceRecord,
  NewAttendanceRecord,
} from '../domain/attendance.ts'
import { QrCodeAlreadyUsedError } from '../domain/attendance-errors.ts'
import type { GeoLocation } from '../domain/attendance.ts'
import type { NewQrCode, QrCodeRecord } from '../domain/qr-code.ts'
import type { AttendanceRepository } from './attendance.repository.ts'
import type { QrCodeRepository } from './qr-code.repository.ts'

interface QrCodeRow {
  id: string
  employeeId: string
  tokenHash: string
  issuedAt: Date
  expiresAt: Date
  revokedAt: Date | null
  location: GeoLocation | null
}

interface EmployeeRow {
  id: string
  username: string
  fullName: string
  department: string | null
  isActive: boolean
}

interface LatestRecordRow {
  eventType: AttendanceEventType
  recordedAt: Date
}

const toQrCode = (row: QrCodeRow): QrCodeRecord => ({
  id: row.id,
  employeeId: row.employeeId,
  tokenHash: row.tokenHash,
  issuedAt: row.issuedAt,
  expiresAt: row.expiresAt,
  revokedAt: row.revokedAt,
  location: row.location,
})

export class PostgresAttendanceRepository implements AttendanceRepository, QrCodeRepository {
  private readonly pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  async createQrCode(qrCode: NewQrCode): Promise<QrCodeRecord> {
    const result = await this.pool.query<QrCodeRow>(
      `INSERT INTO attendance.qr_codes
         (employee_id, token_hash, issued_at, expires_at, location)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id::text AS id, employee_id::text AS "employeeId",
                 token_hash AS "tokenHash", issued_at AS "issuedAt",
                 expires_at AS "expiresAt", revoked_at AS "revokedAt", location`,
      [
        qrCode.employeeId,
        qrCode.tokenHash,
        qrCode.issuedAt,
        qrCode.expiresAt,
        qrCode.location ? JSON.stringify(qrCode.location) : null,
      ],
    )

    return toQrCode(result.rows[0])
  }

  async findQrCodeByTokenHash(tokenHash: string): Promise<QrCodeRecord | null> {
    const result = await this.pool.query<QrCodeRow>(
      `SELECT id::text AS id, employee_id::text AS "employeeId",
              token_hash AS "tokenHash", issued_at AS "issuedAt",
              expires_at AS "expiresAt", revoked_at AS "revokedAt", location
       FROM attendance.qr_codes
       WHERE token_hash = $1
       LIMIT 1`,
      [tokenHash],
    )
    const row = result.rows[0]

    return row ? toQrCode(row) : null
  }

  async findEmployeeById(id: string): Promise<AttendanceEmployee | null> {
    const result = await this.pool.query<EmployeeRow>(
      `SELECT id::text AS id, username, full_name AS "fullName",
              department, is_active AS "isActive"
       FROM "user".users
       WHERE id = $1
       LIMIT 1`,
      [id],
    )

    return result.rows[0] ?? null
  }

  async findLatestRecord(employeeId: string): Promise<LatestAttendanceRecord | null> {
    const result = await this.pool.query<LatestRecordRow>(
      `SELECT event_type AS "eventType", recorded_at AS "recordedAt"
       FROM attendance.attendance_records
       WHERE employee_id = $1
       ORDER BY recorded_at DESC, id DESC
       LIMIT 1`,
      [employeeId],
    )

    return result.rows[0] ?? null
  }

  async createRecord(record: NewAttendanceRecord): Promise<AttendanceRecord> {
    const client = await this.pool.connect()

    try {
      await client.query('BEGIN')

      const consumed = await client.query(
        `UPDATE attendance.qr_codes
         SET revoked_at = NOW()
         WHERE id = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
        [record.qrCodeId],
      )

      if (consumed.rowCount !== 1) {
        throw new QrCodeAlreadyUsedError()
      }

      const inserted = await client.query<{ id: string; recordedAt: Date }>(
        `INSERT INTO attendance.attendance_records
           (employee_id, gate_id, event_type, recorded_at, source)
         VALUES ($1, NULL, $2, $3, $4)
         RETURNING id::text AS id, recorded_at AS "recordedAt"`,
        [record.employeeId, record.eventType, record.recordedAt, record.source],
      )

      const created = inserted.rows[0]

      await client.query(
        `INSERT INTO attendance.outbox
           (event_id, aggregate_type, aggregate_id, event_type, payload)
         VALUES ($1, $2, $3, $4, $5::jsonb)`,
        [
          record.eventId,
          'ATTENDANCE',
          created.id,
          'attendance.recorded',
          JSON.stringify({
            recordId: created.id,
            employeeId: record.employeeId,
            eventType: record.eventType,
            recordedAt: created.recordedAt.toISOString(),
            source: record.source,
            qrCodeId: record.qrCodeId,
            qrLocation: record.qrLocation,
            kioskLocation: record.kioskLocation,
          }),
        ],
      )

      await client.query('COMMIT')

      return {
        id: created.id,
        employeeId: record.employeeId,
        eventType: record.eventType,
        recordedAt: created.recordedAt,
        source: record.source,
      }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  }
}
