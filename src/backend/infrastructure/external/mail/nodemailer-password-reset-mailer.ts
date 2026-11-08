import { createTransport } from 'nodemailer'
import type { PasswordResetMailer } from '../../../modules/user/mailer/password-reset-mailer.ts'

export interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
}

export class NodemailerPasswordResetMailer implements PasswordResetMailer {
  private readonly transport: ReturnType<typeof createTransport> | null
  private readonly from: string

  constructor(smtp: SmtpConfig, from: string) {
    this.from = from
    // Without SMTP the send fails loudly; the reset link is never printed.
    this.transport = smtp.host
      ? createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.port === 465,
          auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
        })
      : null
  }

  async sendPasswordReset(to: string, link: string, ttlMinutes: number): Promise<void> {
    if (!this.transport) {
      throw new Error('SMTP_HOST is not configured')
    }

    await this.transport.sendMail({
      from: this.from,
      to,
      subject: 'Reset your TMC Attendance password',
      text: [
        'Someone requested a password reset for your TMC Attendance account.',
        '',
        `Open this link within ${ttlMinutes} minutes to choose a new password:`,
        link,
        '',
        'If you did not request this, you can ignore this email.',
      ].join('\n'),
    })
  }
}
