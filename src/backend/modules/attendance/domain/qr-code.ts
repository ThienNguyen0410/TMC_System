export interface QrCode {
  id: string
  employeeId: string
  issuedAt: Date
  expiresAt: Date
}

export interface IssuedQrCode {
  token: string
  expiresAt: Date
  expiresInSeconds: number
}

export interface TokenHasher {
  hash(token: string): string
}

export interface TokenGenerator {
  generate(): string
}
