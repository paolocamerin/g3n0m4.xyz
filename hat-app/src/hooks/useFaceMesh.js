import { useState, useEffect, useRef } from 'react'
import { FaceMesh } from '@mediapipe/face_mesh'
import { drawFaceMesh } from '../utils/drawFaceMesh'

/**
 * MediaPipe Face Mesh: 468 3D landmarks per face.
 * Landmarks: x, y in [0, 1] (normalized image), z = relative depth (smaller = closer).
 * When canvasRef is provided, draws the camera feed + face mesh to that canvas (debug view).
 */
const NOSE_TIP_INDEX = 1

export function useFaceMesh(videoRef, enabled = true, canvasRef = null, drawMesh = true) {
  const [landmarks, setLandmarks] = useState(null)
  const [faceDetected, setFaceDetected] = useState(false)
  const [error, setError] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const faceMeshRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!enabled || !videoRef?.current) return

    let cancelled = false
    const initFaceMesh = async () => {
      try {
        const faceMesh = new FaceMesh({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
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
                  drawFaceMesh(ctx, results.multiFaceLandmarks, w, h, {
                    contours: true,
                    tesselation: false,
                  })
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

  return {
    landmarks,
    noseTip,
    faceDetected,
    error,
  }
}
