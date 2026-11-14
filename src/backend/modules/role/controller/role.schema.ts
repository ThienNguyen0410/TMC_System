import { z } from 'zod'

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
