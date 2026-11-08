import { isValidTimeZone } from '../modules/report/domain/report-dates.ts'

const requestedPort = Number(process.env.PORT ?? 3001)
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET ?? ''
const nodeEnv = process.env.NODE_ENV ?? 'development'
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

if (!jwtAccessSecret) {
  throw new Error('JWT_ACCESS_SECRET is required')
}

const readPositiveNumber = (value: string | undefined, fallback: number): number => {
  if (value !== undefined && (!value.trim() || !Number.isFinite(Number(value)) || Number(value) <= 0)) {
    throw new Error('Numeric environment values must be positive numbers')
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// `||`, not `??`: a blank value in .env should fall back to the default too.
const reportLateAfter = process.env.REPORT_LATE_AFTER || '09:00:00'
if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(reportLateAfter)) {
  throw new Error('REPORT_LATE_AFTER must be a time in HH:mm:ss format')
}

const reportTimeZone = process.env.REPORT_TIME_ZONE || 'Asia/Ho_Chi_Minh'
if (!isValidTimeZone(reportTimeZone)) {
  throw new Error('REPORT_TIME_ZONE must be a named IANA time zone such as Asia/Ho_Chi_Minh')
}

if (nodeEnv === 'production') {
  if (process.env.COOKIE_SECURE !== 'true') {
    throw new Error('COOKIE_SECURE=true is required in production')
  }

  if (allowedOrigins.length === 0) {
    throw new Error('ALLOWED_ORIGINS is required in production')
  }

  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP_HOST is required in production')
  }
}

export const env = {
  port: Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3001,
  nodeEnv,
  jwtAccessSecret,
  accessTokenTtlSeconds: readPositiveNumber(process.env.ACCESS_TOKEN_TTL_SECONDS, 900),
  refreshTokenTtlDays: readPositiveNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
  passwordResetTtlMinutes: readPositiveNumber(process.env.PASSWORD_RESET_TTL_MINUTES, 30),
  appBaseUrl: (process.env.APP_BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  allowedOrigins,
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: readPositiveNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
  mailFrom: process.env.MAIL_FROM ?? 'TMC System <no-reply@tmc.local>',
  hrPayrollBaseUrl: process.env.HR_PAYROLL_BASE_URL ?? '',
  hrPayrollApiKey: process.env.HR_PAYROLL_API_KEY ?? '',
  reportLateAfter,
  reportTimeZone,
}
