import { Router } from 'express'
import { requireAuth } from '../../user/middleware/require-auth.ts'
import type { AuthService } from '../../user/service/auth.service.ts'
import type { RoleController } from '../controller/role.controller.ts'
import { RBAC_MANAGE_PERMISSION } from '../domain/role.ts'
import { requirePermission } from '../middleware/require-permission.ts'
import type { PermissionChecker } from '../repository/permission-checker.ts'

export const createRoleRouter = (
  controller: RoleController,
  authService: AuthService,
  checker: PermissionChecker,
): Router => {
  const router = Router()
  const canManage = requirePermission(checker, RBAC_MANAGE_PERMISSION)

  router.use(requireAuth(authService))

  router.get('/me/permissions', (request, response) => controller.myPermissions(request, response))

  router.get('/permissions', canManage, (request, response) =>
    controller.listPermissions(request, response),
  )
  router.get('/roles', canManage, (request, response) => controller.listRoles(request, response))
  router.get('/roles/:roleName', canManage, (request, response) =>
    controller.getRole(request, response),
  )
  router.patch('/roles/:roleName', canManage, (request, response) =>
    controller.updateRole(request, response),
  )
  router.put('/roles/:roleName/permissions', canManage, (request, response) =>
    controller.replaceRolePermissions(request, response),
  )
  router.get('/users/:userId/role', canManage, (request, response) =>
    controller.getUserRole(request, response),
  )
  router.put('/users/:userId/role', canManage, (request, response) =>
    controller.changeUserRole(request, response),
  )

  return router
}
