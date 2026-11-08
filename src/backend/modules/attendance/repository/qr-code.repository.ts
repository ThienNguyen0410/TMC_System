import type { QrCode } from '../domain/qr-code.ts'

export interface CreateQrCodeInput {
  employeeId: string
  tokenHash: string
  issuedAt: Date
  expiresAt: Date
}

export interface QrCodeRepository {
  revokeActiveByEmployeeId(employeeId: string, revokedAt: Date): Promise<void>
  create(input: CreateQrCodeInput): Promise<QrCode>
  findActiveByTokenHash(tokenHash: string, at: Date): Promise<QrCode | null>
  revokeById(id: string, revokedAt: Date): Promise<void>
}
