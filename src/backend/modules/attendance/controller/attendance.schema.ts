import { z } from 'zod'

export const geoLocationSchema = z.object({
  latitude: z
    .number({ error: 'location.latitude must be a number.' })
    .min(-90, 'location.latitude must be between -90 and 90.')
    .max(90, 'location.latitude must be between -90 and 90.'),
  longitude: z
    .number({ error: 'location.longitude must be a number.' })
    .min(-180, 'location.longitude must be between -180 and 180.')
    .max(180, 'location.longitude must be between -180 and 180.'),
  accuracy: z
    .number({ error: 'location.accuracy must be a number.' })
    .min(0, 'location.accuracy must not be negative.'),
})

export const createQrCodeSchema = z.object({
  location: geoLocationSchema.nullish(),
})

export const scanAttendanceSchema = z.object({
  token: z
    .string({ error: 'token is required.' })
    .trim()
    .min(1, 'token is required.')
    .max(512, 'token is too long.'),
  location: geoLocationSchema.nullish(),
})
