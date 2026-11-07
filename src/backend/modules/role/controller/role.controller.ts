import type { Request, Response } from 'express'
import type { z } from 'zod'
import { ValidationError } from '../../../shared/errors/app-error.ts'
import type { RoleService } from '../service/role.service.ts'
import {
  changeUserRoleSchema,
  replaceRolePermissionsSchema,
  updateRoleSchema,
  userIdParamSchema,
} from './role.schema.ts'

const parseOrThrow = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value)

  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid request')
  }

  return parsed.data
}

export class RoleController {
  private readonly service: RoleService

  constructor(service: RoleService) {
    this.service = service
  }

  async myPermissions(_request: Request, response: Response): Promise<void> {
    const permissions = await this.service.getPermissionsForUser(this.actorId(response))
    response.status(200).json({ data: { permissions } })
  }

  async listPermissions(_request: Request, response: Response): Promise<void> {
    const permissions = await this.service.listPermissions()
    response.status(200).json({ data: { permissions } })
  }

  async listRoles(_request: Request, response: Response): Promise<void> {
    const roles = await this.service.listRoles()
    response.status(200).json({ data: { roles } })
  }

  async getRole(request: Request, response: Response): Promise<void> {
    const role = await this.service.getRole(this.roleName(request))
    response.status(200).json({ data: { role } })
  }

  async updateRole(request: Request, response: Response): Promise<void> {
    const { description } = parseOrThrow(updateRoleSchema, request.body)
    const role = await this.service.updateRoleDescription(this.roleName(request), description)
    response.status(200).json({ data: { role } })
  }

  async replaceRolePermissions(request: Request, response: Response): Promise<void> {
    const { permissionCodes } = parseOrThrow(replaceRolePermissionsSchema, request.body)
    const role = await this.service.replaceRolePermissions(this.roleName(request), permissionCodes)
    response.status(200).json({ data: { role } })
  }

  async getUserRole(request: Request, response: Response): Promise<void> {
    const assignment = await this.service.getUserRole(this.userId(request))
    response.status(200).json({ data: { assignment } })
  }

  async changeUserRole(request: Request, response: Response): Promise<void> {
    const { role } = parseOrThrow(changeUserRoleSchema, request.body)
    const assignment = await this.service.changeUserRole(
      this.actorId(response),
      this.userId(request),
      role,
    )
    response.status(200).json({ data: { assignment } })
  }

  private roleName(request: Request): string {
    return String(request.params.roleName)
  }

  private userId(request: Request): string {
    return parseOrThrow(userIdParamSchema, request.params.userId)
  }

  /** Set by requireAuth. */
  private actorId(response: Response): string {
    return String(response.locals.user.id)
  }
}
