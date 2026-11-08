import { EmployeeNotFoundError, InvalidQrCodeError } from '../attendance.errors.ts'
import { QR_CODE_TTL_SECONDS } from '../domain/attendance-policy.ts'
import type { IssuedQrCode, QrCode, TokenGenerator, TokenHasher } from '../domain/qr-code.ts'
import type { EmployeeRepository } from '../repository/employee.repository.ts'
import type { QrCodeRepository } from '../repository/qr-code.repository.ts'

export class QrCodeService {
  private readonly qrCodeRepository: QrCodeRepository
  private readonly employeeRepository: EmployeeRepository
  private readonly tokenGenerator: TokenGenerator
  private readonly tokenHasher: TokenHasher
  private readonly clock: () => Date

  constructor(
    qrCodeRepository: QrCodeRepository,
    employeeRepository: EmployeeRepository,
    tokenGenerator: TokenGenerator,
    tokenHasher: TokenHasher,
    clock: () => Date = () => new Date(),
  ) {
    this.qrCodeRepository = qrCodeRepository
    this.employeeRepository = employeeRepository
    this.tokenGenerator = tokenGenerator
    this.tokenHasher = tokenHasher
    this.clock = clock
  }

  async issueForEmployee(employeeId: string): Promise<IssuedQrCode> {
    const employee = await this.employeeRepository.findById(employeeId)

    if (!employee) {
      throw new EmployeeNotFoundError(employeeId)
    }

    const issuedAt = this.clock()
    const expiresAt = new Date(issuedAt.getTime() + QR_CODE_TTL_SECONDS * 1000)
    const token = this.tokenGenerator.generate()

    await this.qrCodeRepository.revokeActiveByEmployeeId(employeeId, issuedAt)
    await this.qrCodeRepository.create({
      employeeId,
      tokenHash: this.tokenHasher.hash(token),
      issuedAt,
      expiresAt,
    })

    return {
      token,
      expiresAt,
      expiresInSeconds: QR_CODE_TTL_SECONDS,
    }
  }

  async findValidByToken(token: string): Promise<QrCode> {
    const qrCode = await this.qrCodeRepository.findActiveByTokenHash(
      this.tokenHasher.hash(token),
      this.clock(),
    )

    if (!qrCode) {
      throw new InvalidQrCodeError()
    }

    return qrCode
  }

  async revoke(qrCodeId: string): Promise<void> {
    await this.qrCodeRepository.revokeById(qrCodeId, this.clock())
  }
}
