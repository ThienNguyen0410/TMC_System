import { z } from 'zod'

const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export const registerSchema = z.object({
  fullName: z
    .string({ error: 'Full name is required.' })
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(60, 'Full name must be 60 characters or fewer.'),
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
  email: z
    .string({ error: 'Email is required.' })
    .trim()
    .toLowerCase()
    .max(100, 'Email must be 100 characters or fewer.')
    .email('Please enter a valid email address.'),
  phone: z
    .string({ error: 'Phone number is required.' })
    .trim()
    .regex(/^(0|\+84)\d{9}$/, 'Enter a valid Vietnamese phone number, e.g. 0901234567.'),
  dateOfBirth: z
    .iso
    .date('Please enter a valid date of birth.')
    .refine(
      (value) => value <= new Date().toISOString().slice(0, 10),
      'Date of birth cannot be in the future.',
    ),
})
