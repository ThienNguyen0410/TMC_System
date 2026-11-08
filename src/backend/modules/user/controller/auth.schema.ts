import { z } from 'zod'
import type { UserRole } from '../domain/auth-user.ts'

const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/
const userRoles = [
  'employee',
  'production_supervisor',
  'hr',
  'security_guard',
  'admin',
  'executive_management',
] as const satisfies readonly UserRole[]
const roleAliases: Record<string, UserRole> = {
  PS: 'production_supervisor',
  'security-guard': 'security_guard',
  'executive managemen': 'executive_management',
}

export const fullNameSchema = z
  .string({ error: 'Full name is required.' })
  .trim()
  .min(2, 'Full name must be at least 2 characters.')
  .max(60, 'Full name must be 60 characters or fewer.')

export const emailSchema = z
  .string({ error: 'Email is required.' })
  .trim()
  .toLowerCase()
  .max(100, 'Email must be 100 characters or fewer.')
  .email('Please enter a valid email address.')

export const phoneSchema = z
  .string({ error: 'Phone number is required.' })
  .trim()
  .regex(/^(0|\+84)\d{9}$/, 'Enter a valid Vietnamese phone number, e.g. 0901234567.')

export const dateOfBirthSchema = z
  .iso
  .date('Please enter a valid date of birth.')
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    'Date of birth cannot be in the future.',
  )

export const loginSchema = z.object({
  username: z
    .string({ error: 'username is required' })
    .trim()
    .min(1, 'username is required'),
  password: z.string({ error: 'password is required' }).min(1, 'password is required'),
})

export const registerSchema = z.object({
  fullName: fullNameSchema,
  username: z
    .string({ error: 'Username is required.' })
    .trim()
    .toLowerCase()
    .regex(
      /^[a-zA-Z0-9._-]{4,20}$/,
      'Use 4-20 letters, numbers, dots, dashes, or underscores.',
    ),
  password: z
    .string({ error: 'Password is required.' })
    .regex(passwordPolicy, 'Include uppercase, lowercase, number, and symbol.'),
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: dateOfBirthSchema,
  role: z
    .string({ error: 'Role is required.' })
    .trim()
    .transform((value) => roleAliases[value] ?? value)
    .pipe(z.enum(userRoles, { error: 'Select a valid role.' })),
})

export const forgotPasswordSchema = z.object({
  email: z
    .string({ error: 'Email is required.' })
    .trim()
    .toLowerCase()
    .max(100, 'Email must be 100 characters or fewer.')
    .email('Please enter a valid email address.'),
})

export const resetPasswordSchema = z.object({
  token: z.string({ error: 'Reset token is required.' }).trim().min(1, 'Reset token is required.'),
  password: z
    .string({ error: 'Password is required.' })
    .regex(passwordPolicy, 'Include uppercase, lowercase, number, and symbol.'),
})
