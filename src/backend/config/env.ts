const requestedPort = Number(process.env.PORT ?? 3001)

const reportLateAfter = process.env.REPORT_LATE_AFTER ?? '09:00:00'
if (!/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(reportLateAfter)) {
  throw new Error('REPORT_LATE_AFTER must be a time in HH:mm:ss format')
}

const reportTimeZone = process.env.REPORT_TIME_ZONE ?? 'Asia/Ho_Chi_Minh'
try {
  new Intl.DateTimeFormat('en', { timeZone: reportTimeZone })
} catch {
  throw new Error('REPORT_TIME_ZONE must be a valid IANA time zone')
}

export const env = {
  port: Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3001,
  hrPayrollBaseUrl: process.env.HR_PAYROLL_BASE_URL ?? '',
  hrPayrollApiKey: process.env.HR_PAYROLL_API_KEY ?? '',
  reportLateAfter,
  reportTimeZone,
}
