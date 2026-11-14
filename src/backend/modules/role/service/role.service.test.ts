import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../../shared/errors/app-error.ts'
import type { Permission, Role, RoleName } from '../domain/role.ts'
import type { RoleRepository } from '../repository/role.repository.ts'
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
  // Which role each account has; only needed to answer findPermissionCodesByUserId.
  users = new Map<string, { role: RoleName }>([
    ['1', { role: 'admin' }],
    ['2', { role: 'employee' }],
  ])

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

}

const setup = () => {
  const repository = new FakeRoleRepository()
  const service = new RoleService(repository)
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

test("getPermissionsForUser returns the user's codes", async () => {
  const { service } = setup()

  assert.deepEqual(await service.getPermissionsForUser('2'), ['attendance.view_own', 'qr.view_own'])
})
