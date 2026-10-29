const requestedPort = Number(process.env.PORT ?? 3001)

export const env = {
  port: Number.isInteger(requestedPort) && requestedPort > 0 ? requestedPort : 3001,
  hrPayrollBaseUrl: process.env.HR_PAYROLL_BASE_URL ?? '',
  hrPayrollApiKey: process.env.HR_PAYROLL_API_KEY ?? '',
}
