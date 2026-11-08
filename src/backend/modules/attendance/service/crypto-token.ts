import { createHash, randomBytes } from 'node:crypto'
import type { TokenGenerator, TokenHasher } from '../domain/qr-code.ts'

export class CryptoTokenHasher implements TokenHasher {
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}

export class CryptoTokenGenerator implements TokenGenerator {
  generate(): string {
    return randomBytes(32).toString('base64url')
  }
}
