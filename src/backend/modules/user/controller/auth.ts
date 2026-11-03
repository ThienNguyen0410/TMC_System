import type { Request, Response } from 'express'
import { ValidationError } from '../../../shared/errors/app-error.ts'
import type { AuthService } from '../service/auth.service.ts'
import { loginSchema, registerSchema } from './auth.schema.ts'

export class AuthController {
  private readonly authService: AuthService

  constructor(authService: AuthService) {
    this.authService = authService
  }

  async login(request: Request, response: Response): Promise<void> {
    const parsed = loginSchema.safeParse(request.body)

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid credentials')
    }

    const user = await this.authService.login(parsed.data.username, parsed.data.password)

    response.status(200).json({
      data: {
        user,
      },
    })
  }

  async register(request: Request, response: Response): Promise<void> {
    const parsed = registerSchema.safeParse(request.body)

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid registration details')
    }

    const user = await this.authService.register(parsed.data)

    response.status(201).json({
      data: {
        user,
      },
    })
  }
}
