import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'

export interface AccessTokenPayload {
  id: string
  username: string
  role: 'employee' | 'admin'
}

const secretKey = (secret: string): Uint8Array => new TextEncoder().encode(secret)

export const signAccessToken = async (
  user: AccessTokenPayload,
  secret: string,
  ttlSeconds: number,
): Promise<string> =>
  new SignJWT({ username: user.username, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secretKey(secret))

export const verifyAccessToken = async (
  token: string,
  secret: string,
): Promise<AccessTokenPayload | null> => {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret), { algorithms: ['HS256'] })
    const { sub, username, role } = payload

    if (
      typeof sub !== 'string' ||
      typeof username !== 'string' ||
      (role !== 'employee' && role !== 'admin')
    ) {
      return null
    }

    return { id: sub, username, role }
  } catch {
    return null
  }
}

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

export const createRefreshToken = (): { token: string; hash: string } => {
  const token = randomBytes(32).toString('base64url')

  return { token, hash: hashToken(token) }
}
