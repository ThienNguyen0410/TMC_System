import { ValidationError } from '../../../shared/errors/app-error.ts'
import type { HttpRequest, HttpResponse } from '../../../shared/http/http.types.ts'
import { asObject, readRequiredString } from '../../../shared/http/parsers.ts'
import type { AuthService } from '../service/auth.service.ts'
import { registerSchema } from './auth.schema.ts'

export class AuthController {
  private readonly authService: AuthService

  constructor(authService: AuthService) {
    this.authService = authService
  }

  async login(request: HttpRequest): Promise<HttpResponse> {
    const body = asObject(request.body)
    const username = readRequiredString(body, 'username')
    const password = body.password

    if (typeof password !== 'string' || password.length === 0) {
      throw new ValidationError('password is required')
    }

    const user = await this.authService.login(username, password)

    return {
      status: 200,
      body: {
        data: {
          user,
        },
      },
    }
  }

  async register(request: HttpRequest): Promise<HttpResponse> {
    const parsed = registerSchema.safeParse(request.body)

    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? 'Invalid registration details',
      )
    }

    const user = await this.authService.register(parsed.data)

    return {
      status: 201,
      body: {
        data: {
          user,
        },
      },
    }
  }
}
