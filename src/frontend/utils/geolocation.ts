import type { GeoLocation } from '../types/attendance'

export function getCurrentLocation(timeoutMs = 8000): Promise<GeoLocation | null> {
  if (!('geolocation' in navigator)) {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    let settled = false

    const finish = (location: GeoLocation | null) => {
      if (settled) {
        return
      }

      settled = true
      window.clearTimeout(timer)
      resolve(location)
    }

    const timer = window.setTimeout(() => finish(null), timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (position) =>
        finish({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }),
      () => finish(null),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: timeoutMs,
      },
    )
  })
}
