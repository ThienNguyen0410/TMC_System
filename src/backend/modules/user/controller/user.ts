import type { Request, Response } from 'express'
import { ValidationError } from '../../../shared/errors/app-error.ts'
import type { UserService } from '../service/user.service.ts'
import { accountIdSchema, updateUserProfileSchema } from './user.schema.ts'

export class UserController {
  private readonly userService: UserService

  constructor(userService: UserService) {
    this.userService = userService
  }

  async list(_request: Request, response: Response): Promise<void> {
    response.status(200).json({ data: { users: await this.userService.listUsers() } })
  }

  async update(request: Request, response: Response): Promise<void> {
    const id = accountIdSchema.safeParse(request.params.id)

    if (!id.success) {
      throw new ValidationError(id.error.issues[0]?.message ?? 'Invalid account id.')
    }

    const parsed = updateUserProfileSchema.safeParse(request.body)

    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid account details.')
    }

    const user = await this.userService.updateProfile(id.data, parsed.data)

    response.status(200).json({ data: { user } })
  }
}
