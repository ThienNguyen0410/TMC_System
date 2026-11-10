import type { NewQrCode, QrCodeRecord } from '../domain/qr-code.ts'

export interface QrCodeRepository {
  createQrCode(qrCode: NewQrCode): Promise<QrCodeRecord>
  findQrCodeByTokenHash(tokenHash: string): Promise<QrCodeRecord | null>
}
