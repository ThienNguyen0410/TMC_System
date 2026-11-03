import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64

const derive = (
  password: string,
  salt: Buffer,
  keyLength: number,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, { N: n, r, p }, (error, key) => {
      if (error) {
        reject(error)
        return
      }

      resolve(key)
    })
  })

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(16)
  const key = await derive(password, salt, KEY_LENGTH, SCRYPT_N, SCRYPT_R, SCRYPT_P)

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64')}$${key.toString('base64')}`
}

export const verifyPassword = async (password: string, stored: string): Promise<boolean> => {
  const [scheme, n, r, p, salt, hash] = stored.split('$')

  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) {
    return false
  }

  const expected = Buffer.from(hash, 'base64')
  const actual = await derive(
    password,
    Buffer.from(salt, 'base64'),
    expected.length,
    Number(n),
    Number(r),
    Number(p),
  ).catch(() => null)

  return actual !== null && actual.length === expected.length && timingSafeEqual(actual, expected)
}
