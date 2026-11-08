import type { CookieOptions, Request, Response } from 'express'
import { env } from '../../../config/env.ts'
import { ValidationError } from '../../../shared/errors/app-error.ts'
import type { AuthService, AuthSession } from '../service/auth.service.ts'
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth.schema.ts'

const REFRESH_COOKIE = 'refresh_token'
const REFRESH_COOKIE_PATH = '/api/auth'

const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.cookieSecure,
  path: REFRESH_COOKIE_PATH,
}

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

    const session = await this.authService.login(parsed.data.username, parsed.data.password)
    this.setRefreshCookie(response, session)

    response.status(200).json({
      data: {
        user: session.user,
        accessToken: session.accessToken,
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

  async forgotPassword(request: Request, response: Response): Promise<void> {
    const parsed = forgotPasswordSchema.safeParse(request.body)

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Please enter a valid email address.')
    }

    await this.authService.requestPasswordReset(parsed.data.email)

    response.status(202).end()
  }

  async resetPassword(request: Request, response: Response): Promise<void> {
    const parsed = resetPasswordSchema.safeParse(request.body)

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid password reset details')
    }

    await this.authService.resetPassword(parsed.data.token, parsed.data.password)

    response.status(204).end()
  }

  async refresh(request: Request, response: Response): Promise<void> {
    const session = await this.authService.refresh(this.readRefreshToken(request))
    this.setRefreshCookie(response, session)

    response.status(200).json({
      data: {
        user: session.user,
        accessToken: session.accessToken,
      },
    })
  }

  async logout(request: Request, response: Response): Promise<void> {
    await this.authService.logout(this.readRefreshToken(request))

    response.clearCookie(REFRESH_COOKIE, refreshCookieOptions)
    response.status(204).end()
  }

  async me(_request: Request, response: Response): Promise<void> {
    response.status(200).json({
      data: {
        user: response.locals.user,
      },
    })
  }

  private readRefreshToken(request: Request): string | undefined {
    const token = request.cookies?.[REFRESH_COOKIE]
    return typeof token === 'string' ? token : undefined
  }

  private setRefreshCookie(response: Response, session: AuthSession): void {
    response.cookie(REFRESH_COOKIE, session.refreshToken, {
      ...refreshCookieOptions,
      maxAge: session.refreshExpiresAt.getTime() - Date.now(),
    })
  }
}
