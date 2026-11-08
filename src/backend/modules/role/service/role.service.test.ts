import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/app-error.ts'
import { AdminProtectedRoleChangePolicy } from '../domain/admin-protected-role-change-policy.ts'
import type { Permission, Role, RoleName, UserRoleAssignment } from '../domain/role.ts'
import type { RoleChangeGuard, RoleRepository } from '../repository/role.repository.ts'
import { RoleService } from './role.service.ts'

const ALL_CODES = [
  'qr.view_own',
  'attendance.view_own',
  'user.manage',
  'qr.manage',
  'gate.manage',
  'gate.monitor',
  'gate.override',
  'attendance.monitor',
  'attendance.adjust',
  'report.view',
  'report.export',
  'payroll.export',
  'audit.view',
  'shift.manage',
  'rbac.manage',
]

class FakeRoleRepository implements RoleRepository {
  permissions: Permission[] = ALL_CODES.map((code) => ({ code, description: null }))
  roles = new Map<RoleName, Role>([
    ['admin', { id: '1', name: 'admin', description: 'Administrator', permissionCodes: [...ALL_CODES] }],
    [
      'employee',
      {
        id: '2',
        name: 'employee',
        description: 'Employee',
        permissionCodes: ['attendance.view_own', 'qr.view_own'],
      },
    ],
  ])
  users = new Map<string, UserRoleAssignment>([
    ['1', { userId: '1', username: 'admin01', role: 'admin', isActive: true }],
    ['2', { userId: '2', username: 'employee01', role: 'employee', isActive: true }],
    ['3', { userId: '3', username: 'locked01', role: 'employee', isActive: false }],
    ['4', { userId: '4', username: 'admin02', role: 'admin', isActive: true }],
  ])
  changeUserRoleCalls = 0
  roleWrites = 0
  /** Simulates another request committing between the service's first read and the lock. */
  beforeLock?: () => void

  async listPermissions(): Promise<Permission[]> {
    return this.permissions
  }

  async listRoles(): Promise<Role[]> {
    return [...this.roles.values()].map((role) => ({ ...role }))
  }

  async findRoleByName(name: RoleName): Promise<Role | null> {
    const role = this.roles.get(name)
    return role ? { ...role, permissionCodes: [...role.permissionCodes] } : null
  }

  async updateRoleDescription(name: RoleName, description: string | null): Promise<void> {
    const role = this.roles.get(name)
    if (role) {
      role.description = description
    }
  }

  async replaceRolePermissions(name: RoleName, permissionCodes: string[]): Promise<void> {
    const role = this.roles.get(name)
    if (role) {
      role.permissionCodes = [...permissionCodes].sort()
    }
  }

  async findPermissionCodesByUserId(userId: string): Promise<string[]> {
    const user = this.users.get(userId)
    return user ? [...(this.roles.get(user.role)?.permissionCodes ?? [])].sort() : []
  }

  async findUserRole(userId: string): Promise<UserRoleAssignment | null> {
    const user = this.users.get(userId)
    return user ? { ...user } : null
  }

  async changeUserRole(
    userId: string,
    newRole: RoleName,
    guard: RoleChangeGuard,
  ): Promise<UserRoleAssignment | null> {
    this.changeUserRoleCalls += 1
    this.beforeLock?.()
    const user = this.users.get(userId)

    if (!user) {
      return null
    }

    const otherActiveAdminCount = [...this.users.values()].filter(
      (candidate) =>
        candidate.userId !== userId && candidate.isActive && candidate.role === 'admin',
    ).length

    if (!guard({ ...user }, otherActiveAdminCount)) {
      return { ...user }
    }

    this.roleWrites += 1
    user.role = newRole
    return { ...user }
  }
}

const setup = () => {
  const repository = new FakeRoleRepository()
  const service = new RoleService(repository, new AdminProtectedRoleChangePolicy())
  return { repository, service }
}

test('getRole rejects an unknown role name', async () => {
  const { service } = setup()

  await assert.rejects(service.getRole('hr'), NotFoundError)
})

test('updateRoleDescription stores the description and returns the role', async () => {
  const { service } = setup()

  const role = await service.updateRoleDescription('employee', 'Factory worker')

  assert.equal(role.name, 'employee')
  assert.equal(role.description, 'Factory worker')
})

test('replaceRolePermissions rejects unknown codes and names them', async () => {
  const { service } = setup()

  await assert.rejects(
    service.replaceRolePermissions('employee', ['report.view', 'nope.x']),
    (error: unknown) => error instanceof ValidationError && error.message.includes('nope.x'),
  )
})

test('replaceRolePermissions deduplicates and trims codes', async () => {
  const { service } = setup()

  const role = await service.replaceRolePermissions('employee', [' report.view ', 'report.view'])

  assert.deepEqual(role.permissionCodes, ['report.view'])
})

test('replaceRolePermissions refuses to drop rbac.manage from admin', async () => {
  const { repository, service } = setup()

  await assert.rejects(service.replaceRolePermissions('admin', ['report.view']), ConflictError)
  assert.ok(repository.roles.get('admin')?.permissionCodes.includes('rbac.manage'))
})

test('replaceRolePermissions allows an empty list for employee', async () => {
  const { service } = setup()

  const role = await service.replaceRolePermissions('employee', [])

  assert.deepEqual(role.permissionCodes, [])
})

test('getUserRole rejects a missing user', async () => {
  const { service } = setup()

  await assert.rejects(service.getUserRole('999'), NotFoundError)
})

test('changeUserRole promotes an employee', async () => {
  const { service } = setup()

  const result = await service.changeUserRole('1', '2', 'admin')

  assert.equal(result.role, 'admin')
})

test('changeUserRole rejects an inactive account', async () => {
  const { service } = setup()

  await assert.rejects(service.changeUserRole('1', '3', 'admin'), ConflictError)
})

test('changeUserRole to the same role is a no-op', async () => {
  const { repository, service } = setup()

  const result = await service.changeUserRole('1', '2', 'employee')

  assert.equal(result.role, 'employee')
  assert.equal(repository.changeUserRoleCalls, 0)
})

test('changeUserRole succeeds without writing when a concurrent request already set the role', async () => {
  const { repository, service } = setup()
  repository.beforeLock = () => {
    const target = repository.users.get('2')
    if (target) {
      target.role = 'admin'
    }
  }

  const result = await service.changeUserRole('4', '2', 'admin')

  assert.equal(result.role, 'admin')
  assert.equal(repository.roleWrites, 0)
})

test('changeUserRole applies the policy', async () => {
  const { service } = setup()

  await assert.rejects(service.changeUserRole('1', '4', 'employee'), ForbiddenError)
})

test("getPermissionsForUser returns the user's codes", async () => {
  const { service } = setup()

  assert.deepEqual(await service.getPermissionsForUser('2'), ['attendance.view_own', 'qr.view_own'])
})
