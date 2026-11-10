import { createHash, randomBytes } from 'node:crypto'
import type { GeoLocation } from './attendance.ts'

export const QR_CODE_TTL_SECONDS = 5
export const QR_CODE_TTL_MS = QR_CODE_TTL_SECONDS * 1000
export const QR_LOCATION_TOLERANCE_METERS = 1

const EARTH_RADIUS_METERS = 6_371_000

export interface QrCodeRecord {
  id: string
  employeeId: string
  tokenHash: string
  issuedAt: Date
  expiresAt: Date
  revokedAt: Date | null
  location: GeoLocation | null
}

export interface NewQrCode {
  employeeId: string
  tokenHash: string
  issuedAt: Date
  expiresAt: Date
  location: GeoLocation | null
}

export interface CreatedQrCode {
  id: string
  token: string
  issuedAt: Date
  expiresAt: Date
  location: GeoLocation | null
}

export function hashQrToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function createQrToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url')

  return { token, hash: hashQrToken(token) }
}

export function isQrCodeExpired(qrCode: QrCodeRecord, now: Date): boolean {
  return qrCode.expiresAt.getTime() <= now.getTime()
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

export function distanceInMeters(left: GeoLocation, right: GeoLocation): number {
  const latitudeDelta = toRadians(right.latitude - left.latitude)
  const longitudeDelta = toRadians(right.longitude - left.longitude)
  const leftLatitude = toRadians(left.latitude)
  const rightLatitude = toRadians(right.latitude)

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(haversine)))
}

export function locationWithinTolerance(
  left: GeoLocation,
  right: GeoLocation,
  toleranceMeters = QR_LOCATION_TOLERANCE_METERS,
): boolean {
  return distanceInMeters(left, right) <= toleranceMeters
}
