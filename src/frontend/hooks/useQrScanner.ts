import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface UseQrScannerProps {
  elementId: string
  onScanSuccess: (decodedText: string) => void
  onError?: (error: string) => void
}

export function useQrScanner({
  elementId,
  onScanSuccess,
  onError,
}: UseQrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const sessionRef = useRef(0)
  const isProcessingRef = useRef(false)
  const onScanSuccessRef = useRef(onScanSuccess)
  const onErrorRef = useRef(onError)

  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess
  }, [onScanSuccess])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  const reportError = useCallback((nextError: string) => {
    setError(nextError)
    onErrorRef.current?.(nextError)
  }, [])

  // Stop camera and release the media stream.
  const stopScanner = useCallback(async () => {
    sessionRef.current += 1

    const scanner = scannerRef.current
    scannerRef.current = null
    setIsScanning(false)

    if (!scanner) return

    try {
      if (scanner.isScanning) {
        await scanner.stop()
      }

      scanner.clear()
    } catch (err) {
      console.error('Failed to stop camera:', err)
    }
  }, [])

  // Start camera and QR scanner.
  const startScanner = useCallback(async () => {
    if (scannerRef.current) return

    if (!navigator.mediaDevices?.getUserMedia) {
      reportError('unavailable')
      return
    }

    setError(null)
    isProcessingRef.current = false

    const session = sessionRef.current + 1
    sessionRef.current = session

    let scanner: Html5Qrcode | null = null

    try {
      scanner = new Html5Qrcode(elementId)
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'user' },
        {
          fps: 10,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const size = Math.floor(
              Math.min(viewfinderWidth, viewfinderHeight) * 0.7,
            )

            return { width: size, height: size }
          },
        },
        (decodedText) => {
          // Prevent duplicate scans while the camera is being stopped.
          if (isProcessingRef.current) return

          isProcessingRef.current = true

          void stopScanner().finally(() => {
            onScanSuccessRef.current(decodedText)
          })
        },
        () => {
          // QR code not detected in this frame.
          // This is normal during continuous scanning.
        },
      )

      // The component may have unmounted while the camera was starting.
      if (session !== sessionRef.current) {
        try {
          if (scanner.isScanning) {
            await scanner.stop()
          }

          scanner.clear()
        } catch (cleanupError) {
          console.error('Failed to clean up camera:', cleanupError)
        }

        return
      }

      setIsScanning(true)
    } catch (err) {
      if (session !== sessionRef.current) return

      if (scannerRef.current === scanner) {
        scannerRef.current = null
      }

      const message = err instanceof Error ? err.message : String(err)

      if (
        message.toLowerCase().includes('permission') ||
        message.toLowerCase().includes('denied') ||
        message.toLowerCase().includes('notallowed')
      ) {
        reportError('permission-denied')
      } else {
        reportError('unavailable')
      }

      console.error('Camera initialization failed:', err)
    }
  }, [elementId, reportError, stopScanner])

  return {
    startScanner,
    stopScanner,
    isScanning,
    error,
  }
}
