import type { Pool } from 'pg'
import type { QrCode } from '../domain/qr-code.ts'
import type { CreateQrCodeInput, QrCodeRepository } from './qr-code.repository.ts'

interface QrCodeRow {
  id: string
  employee_id: string
  issued_at: Date
  expires_at: Date
}

const toQrCode = (row: QrCodeRow): QrCode => ({
  id: row.id,
  employeeId: row.employee_id,
  issuedAt: row.issued_at,
  expiresAt: row.expires_at,
})

export class PostgresQrCodeRepository implements QrCodeRepository {
  private readonly pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  async revokeActiveByEmployeeId(employeeId: string, revokedAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE attendance.qr_codes
       SET revoked_at = $2
       WHERE employee_id = $1
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > $2)`,
      [employeeId, revokedAt],
    )
  }

  async create(input: CreateQrCodeInput): Promise<QrCode> {
    const result = await this.pool.query<QrCodeRow>(
      `INSERT INTO attendance.qr_codes (employee_id, token_hash, issued_at, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id::text AS id,
                 employee_id::text AS employee_id,
                 issued_at,
                 expires_at`,
      [input.employeeId, input.tokenHash, input.issuedAt, input.expiresAt],
    )

    return toQrCode(result.rows[0])
  }

  async findActiveByTokenHash(tokenHash: string, at: Date): Promise<QrCode | null> {
    const result = await this.pool.query<QrCodeRow>(
      `SELECT id::text AS id,
              employee_id::text AS employee_id,
              issued_at,
              expires_at
       FROM attendance.qr_codes
       WHERE token_hash = $1
         AND revoked_at IS NULL
         AND expires_at IS NOT NULL
         AND expires_at > $2
       LIMIT 1`,
      [tokenHash, at],
    )

    const row = result.rows[0]
    return row ? toQrCode(row) : null
  }

  async revokeById(id: string, revokedAt: Date): Promise<void> {
    await this.pool.query(
      `UPDATE attendance.qr_codes
       SET revoked_at = $2
       WHERE id = $1 AND revoked_at IS NULL`,
      [id, revokedAt],
    )
  }
}
