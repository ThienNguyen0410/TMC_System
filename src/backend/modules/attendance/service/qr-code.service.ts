import type { GeoLocation } from '../domain/attendance.ts'
import { InvalidQrCodeError, QrCodeExpiredError } from '../domain/attendance-errors.ts'
import {
  createQrToken,
  hashQrToken,
  isQrCodeExpired,
  QR_CODE_TTL_MS,
  type CreatedQrCode,
  type QrCodeRecord,
} from '../domain/qr-code.ts'
import type { QrCodeRepository } from '../repository/qr-code.repository.ts'
import type { QrCodeValidator } from './qr-code-validator.ts'

export class QrCodeService implements QrCodeValidator {
  private readonly repository: QrCodeRepository
  private readonly now: () => Date

  constructor(repository: QrCodeRepository, now: () => Date = () => new Date()) {
    this.repository = repository
    this.now = now
  }

  async create(employeeId: string, location: GeoLocation | null): Promise<CreatedQrCode> {
    const issuedAt = this.now()
    const expiresAt = new Date(issuedAt.getTime() + QR_CODE_TTL_MS)
    const { token, hash } = createQrToken()
    const stored = await this.repository.createQrCode({
      employeeId,
      tokenHash: hash,
      issuedAt,
      expiresAt,
      location,
    })

    return {
      id: stored.id,
      token,
      issuedAt: stored.issuedAt,
      expiresAt: stored.expiresAt,
      location: stored.location,
    }
  }

  async validate(token: string): Promise<QrCodeRecord> {
    const qrCode = await this.repository.findQrCodeByTokenHash(hashQrToken(token.trim()))

    if (!qrCode || qrCode.revokedAt) {
      throw new InvalidQrCodeError()
    }

    if (isQrCodeExpired(qrCode, this.now())) {
      throw new QrCodeExpiredError()
    }

    return qrCode
  }
}
