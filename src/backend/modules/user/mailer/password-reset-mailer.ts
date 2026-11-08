export interface PasswordResetMailer {
  sendPasswordReset(to: string, link: string, ttlMinutes: number): Promise<void>
}
