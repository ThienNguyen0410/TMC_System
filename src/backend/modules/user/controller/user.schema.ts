import { z } from 'zod'
import {
  dateOfBirthSchema,
  emailSchema,
  fullNameSchema,
  phoneSchema,
} from './auth.schema.ts'

export const accountIdSchema = z
  .string({ error: 'Account id is required.' })
  .regex(/^\d{1,19}$/, 'Account id must be a number.')

export const updateUserProfileSchema = z.object({
  fullName: fullNameSchema,
  email: emailSchema,
  phone: phoneSchema,
  department: z
    .string({ error: 'Department is required.' })
    .trim()
    .min(1, 'Department is required.')
    .max(100, 'Department must be 100 characters or fewer.'),
  dateOfBirth: dateOfBirthSchema,
})
