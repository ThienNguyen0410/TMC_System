import type { AttendanceLocationPayload } from '../types/attendance'

export function getCurrentLocation(): Promise<AttendanceLocationPayload | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      },
    )
  })
}
