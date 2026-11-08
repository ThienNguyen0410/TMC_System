import { z } from 'zod'
import { SYSTEM_ROLES } from '../domain/role.ts'

// Up to 18 digits keeps the value inside Postgres BIGINT range.
export const userIdParamSchema = z
  .string({ error: 'userId is required' })
  .regex(/^\d{1,18}$/, 'userId must be a numeric id')

export const updateRoleSchema = z.object(
  {
    description: z
      .string({ error: 'description must be a string or null' })
      .trim()
      .max(500, 'description must be 500 characters or fewer')
      // A blank description means "no description", stored as null like an explicit null.
      .transform((value) => (value === '' ? null : value))
      .nullable(),
  },
  { error: 'Request body must be a JSON object' },
)

export const replaceRolePermissionsSchema = z.object(
  {
    permissionCodes: z
      .array(z.string().trim().min(1, 'permission codes cannot be empty'), {
        error: 'permissionCodes must be an array of strings',
      })
      .max(100, 'permissionCodes can contain at most 100 codes'),
  },
  { error: 'Request body must be a JSON object' },
)

export const changeUserRoleSchema = z.object(
  {
    role: z.enum(SYSTEM_ROLES, { error: `role must be one of: ${SYSTEM_ROLES.join(', ')}` }),
  },
  { error: 'Request body must be a JSON object' },
)
