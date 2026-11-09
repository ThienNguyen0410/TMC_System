import type { QrCodeRecord } from '../domain/qr-code.ts'

export interface QrCodeValidator {
  validate(token: string): Promise<QrCodeRecord>
}
