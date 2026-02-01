import { useState, useEffect, useRef } from 'react'
import jsQR from 'jsqr'

/** Horizontal flip of RGBA ImageData (mutates data). */
function flipImageDataHorizontal(data, width, height) {
  const rowBytes = width * 4
  const row = new Uint8ClampedArray(rowBytes)
  for (let y = 0; y < height; y++) {
    const base = y * rowBytes
    row.set(data.subarray(base, base + rowBytes))
    for (let x = 0; x < width; x++) {
      const dstIdx = base + x * 4
      const srcOff = (width - 1 - x) * 4
      data[dstIdx] = row[srcOff]
      data[dstIdx + 1] = row[srcOff + 1]
      data[dstIdx + 2] = row[srcOff + 2]
      data[dstIdx + 3] = row[srcOff + 3]
    }
  }
}

/**
 * Run jsQR on raw RGBA data. Optionally try flipped if no code found.
 * @returns {{ data: string, location: object } | null}
 */
export function decodeQRFromImageData(data, width, height, options = {}) {
  const { tryFlipped = true } = options
  let code = jsQR(data, width, height)
  if (!code && tryFlipped) {
    const copy = new Uint8ClampedArray(data)
    flipImageDataHorizontal(copy, width, height)
    code = jsQR(copy, width, height)
  }
  return code
}

/** Convert location from raw video coords to display coords (mirror x). */
function locationToDisplay(loc, width) {
  if (!loc) return null
  return {
    topLeftCorner: { x: width - loc.topRightCorner.x, y: loc.topRightCorner.y },
    topRightCorner: { x: width - loc.topLeftCorner.x, y: loc.topLeftCorner.y },
    bottomRightCorner: { x: width - loc.bottomLeftCorner.x, y: loc.bottomLeftCorner.y },
    bottomLeftCorner: { x: width - loc.bottomRightCorner.x, y: loc.bottomRightCorner.y },
  }
}

function applyQRResult(code, usedFlipped, w, h, expectedPayload, setMarkerDetected, setPayload, setLocation, setImageSize) {
  if (code) {
    const matches = expectedPayload == null || code.data === expectedPayload
    setMarkerDetected(matches)
    setPayload(code.data)
    const loc = code.location ?? null
    setLocation(usedFlipped ? loc : locationToDisplay(loc, w))
    setImageSize({ width: w, height: h })
    console.log('[QR]', w, 'x', h, 'detected', usedFlipped ? '(flipped)' : '(raw):', code.data)
  } else {
    setMarkerDetected(false)
    setPayload(null)
    setLocation(null)
    console.log('[QR]', w, 'x', h, 'none')
  }
}

/**
 * Detects QR codes in the video stream using jsQR (once per interval).
 * Tries raw frame first, then flipped, so it works regardless of camera mirroring.
 * Uses a Web Worker when available so high-res decode doesn't block the main thread.
 * Returns markerDetected, payload, location (in display coords), imageSize.
 * @param {React.RefObject<HTMLVideoElement>} videoRef - ref to the video element (camera stream)
 * @param {{ intervalMs?: number, expectedPayload?: string, debugCanvasRef?: React.RefObject<HTMLCanvasElement>, useWorker?: boolean }} options
 */
const QR_INTERVAL_WHEN_HIDDEN_MS = 2000

export function useMarkerDetection(videoRef, options = {}) {
  const { intervalMs = 1000, expectedPayload, debugCanvasRef, useWorker = true } = options
  const [markerDetected, setMarkerDetected] = useState(false)
  const [payload, setPayload] = useState(null)
  const [location, setLocation] = useState(null)
  const [imageSize, setImageSize] = useState(null)
  const canvasRef = useRef(null)
  const intervalRef = useRef(null)
  const workerRef = useRef(null)
  const pendingRef = useRef(false)

  useEffect(() => {
    if (useWorker) {
      try {
        workerRef.current = new Worker(new URL('../workers/qrWorker.js', import.meta.url), { type: 'module' })
      } catch (_) {
        workerRef.current = null
      }
      return () => {
        if (workerRef.current) {
          workerRef.current.terminate()
          workerRef.current = null
        }
      }
    }
  }, [useWorker])

  useEffect(() => {
    const video = videoRef?.current
    if (!video) return

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    const worker = workerRef.current

    const onWorkerMessage = (e) => {
      const { code, usedFlipped } = e.data
      const w = canvas.width
      const h = canvas.height
      applyQRResult(code, usedFlipped, w, h, expectedPayload, setMarkerDetected, setPayload, setLocation, setImageSize)
      pendingRef.current = false
    }
    if (worker) worker.addEventListener('message', onWorkerMessage)

    const checkFrame = () => {
      if (document.visibilityState === 'hidden') return
      if (!videoRef?.current || video.readyState < 2) {
        console.log('[QR] skip: video not ready, readyState=', video.readyState)
        return
      }

      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) {
        console.log('[QR] skip: zero size', w, 'x', h)
        return
      }

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }

      ctx.drawImage(video, 0, 0, w, h)
      const imageData = ctx.getImageData(0, 0, w, h)
      /* Full resolution passed to jsQR (no downscale) for highest precision */

      const debugCanvas = debugCanvasRef?.current
      if (debugCanvas && debugCanvas.getContext) {
        const dCtx = debugCanvas.getContext('2d')
        if (dCtx) {
          debugCanvas.width = w
          debugCanvas.height = h
          dCtx.putImageData(imageData, 0, 0)
        }
      }

      if (worker && !pendingRef.current) {
        pendingRef.current = true
        worker.postMessage(
          { buffer: imageData.data.buffer, width: imageData.width, height: imageData.height },
          [imageData.data.buffer]
        )
        return
      }

      if (worker) return

      let code = jsQR(imageData.data, imageData.width, imageData.height)
      let usedFlipped = false
      if (!code) {
        const flipped = new Uint8ClampedArray(imageData.data)
        flipImageDataHorizontal(flipped, w, h)
        code = jsQR(flipped, imageData.width, imageData.height)
        usedFlipped = !!code
      }
      applyQRResult(code, usedFlipped, w, h, expectedPayload, setMarkerDetected, setPayload, setLocation, setImageSize)
    }

    const schedule = () => {
      const ms = document.visibilityState === 'hidden' ? QR_INTERVAL_WHEN_HIDDEN_MS : intervalMs
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = setInterval(checkFrame, ms)
      checkFrame()
    }

    const onVisibilityChange = () => { schedule() }

    document.addEventListener('visibilitychange', onVisibilityChange)
    schedule()

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (worker) worker.removeEventListener('message', onWorkerMessage)
    }
  }, [videoRef, intervalMs, expectedPayload, debugCanvasRef, useWorker])

  return { markerDetected, payload, location, imageSize }
}
