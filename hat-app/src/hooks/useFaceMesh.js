import { useState, useEffect, useRef } from 'react'
import { drawFaceMesh } from '../utils/drawFaceMesh'

/**
 * MediaPipe Face Mesh: 468 3D landmarks per face.
 * When canvasRef is provided, draws the camera feed + face mesh to that canvas (debug view).
 * Loads FaceMesh via dynamic import; if undefined (Vite production/mobile), loads from CDN.
 */
const NOSE_TIP_INDEX = 1
const FOREHEAD_INDEX = 10   // forehead center (between eyes)
const HEAD_TOP_INDEX = 151 // top of head (for spawn + tilt)
const MEDIAPIPE_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4'

let cdnLoadPromise = null
function loadFaceMeshFromCDN() {
  if (typeof window !== 'undefined' && typeof window.FaceMesh === 'function') {
    return Promise.resolve(window.FaceMesh)
  }
  if (cdnLoadPromise) return cdnLoadPromise
  cdnLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${MEDIAPIPE_CDN}/face_mesh.js`
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      if (typeof window.FaceMesh === 'function') resolve(window.FaceMesh)
      else reject(new Error('FaceMesh not found on window after script load'))
    }
    script.onerror = () => reject(new Error('Failed to load MediaPipe Face Mesh script'))
    document.head.appendChild(script)
  })
  return cdnLoadPromise
}

async function getFaceMeshConstructor() {
  try {
    const mod = await import('@mediapipe/face_mesh')
    const C = mod?.FaceMesh ?? mod?.default?.FaceMesh ?? (typeof mod?.default === 'function' ? mod.default : null)
    if (typeof C === 'function') return { FaceMesh: C, fromCDN: false }
  } catch (_) {
    /* bundled constructor often undefined in production */
  }
  const FaceMesh = await loadFaceMeshFromCDN()
  return { FaceMesh, fromCDN: true }
}

export function useFaceMesh(videoRef, enabled = true, canvasRef = null, drawMesh = true) {
  const [landmarks, setLandmarks] = useState(null)
  const [faceDetected, setFaceDetected] = useState(false)
  const [error, setError] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const faceMeshRef = useRef(null)
  const rafRef = useRef(null)
  const fromCDNRef = useRef(false)

  useEffect(() => {
    if (!enabled || !videoRef?.current) return

    let cancelled = false
    const initFaceMesh = async () => {
      try {
        const { FaceMesh, fromCDN } = await getFaceMeshConstructor()
        if (cancelled) return
        fromCDNRef.current = fromCDN
        if (typeof FaceMesh !== 'function') {
          throw new Error(
            'FaceMesh not available. Try reloading the page; if it persists, your browser may not support this feature.'
          )
        }
        const faceMesh = new FaceMesh({
          locateFile: (file) => `${MEDIAPIPE_CDN}/${file}`,
        })
        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        faceMesh.onResults((results) => {
          if (cancelled) return
          if (results.multiFaceLandmarks?.[0]) {
            const list = results.multiFaceLandmarks[0]
            setLandmarks(list)
            setFaceDetected(true)
          } else {
            setLandmarks(null)
            setFaceDetected(false)
          }
          // Draw camera + mesh to canvas when canvasRef is provided (MediaPipe debug view)
          const canvas = canvasRef?.current
          if (canvas && results.image) {
            const img = results.image
            const w = img.width || img.videoWidth
            const h = img.height || img.videoHeight
            if (w && h) {
              if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w
                canvas.height = h
              }
              const ctx = canvas.getContext('2d')
              if (ctx) {
                ctx.drawImage(img, 0, 0, w, h)
                if (drawMesh) {
                  const opts = {
                    contours: true,
                    tesselation: false,
                  }
                  if (fromCDNRef.current && typeof window !== 'undefined' && window.FACEMESH_CONTOURS) {
                    opts.connectionList = window.FACEMESH_CONTOURS
                    opts.tesselationList = window.FACEMESH_TESSELATION
                  }
                  drawFaceMesh(ctx, results.multiFaceLandmarks, w, h, opts)
                }
              }
            }
          }
        })
        await faceMesh.initialize()
        if (cancelled) return
        faceMeshRef.current = faceMesh
        setInitialized(true)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          console.error('FaceMesh init error:', err)
          setError(err.message || 'Face tracking failed to load')
        }
      }
    }

    initFaceMesh()
    return () => {
      cancelled = true
      faceMeshRef.current = null
      setInitialized(false)
    }
  }, [enabled, videoRef, canvasRef, drawMesh])

  useEffect(() => {
    if (!enabled || !initialized || !faceMeshRef.current || !videoRef?.current) return

    const video = videoRef.current

    const processFrame = async () => {
      if (!faceMeshRef.current) return
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(processFrame)
        return
      }
      try {
        await faceMeshRef.current.send({ image: video })
      } catch (_) {
        // ignore single-frame errors
      }
      rafRef.current = requestAnimationFrame(processFrame)
    }

    rafRef.current = requestAnimationFrame(processFrame)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [enabled, initialized, videoRef])

  const noseTip = landmarks && landmarks[NOSE_TIP_INDEX] ? landmarks[NOSE_TIP_INDEX] : null
  const forehead = landmarks && landmarks[FOREHEAD_INDEX] ? landmarks[FOREHEAD_INDEX] : null
  const headTop = landmarks && landmarks[HEAD_TOP_INDEX] ? landmarks[HEAD_TOP_INDEX] : null

  return {
    landmarks,
    noseTip,
    forehead,
    headTop,
    faceDetected,
    error,
  }
}
