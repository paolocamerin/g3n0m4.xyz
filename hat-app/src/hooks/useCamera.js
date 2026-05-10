import { useState, useEffect, useRef } from 'react'

/**
 * Custom hook for accessing device camera
 * @returns {Object} Camera state and controls
 */
export function useCamera() {
  const [stream, setStream] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasPermission, setHasPermission] = useState(null)
  const videoRef = useRef(null)

  const startCamera = async (constraints = { video: true, audio: false }) => {
    setIsLoading(true)
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setIsLoading(false)
      setError('Camera not supported. Use a modern browser (Chrome, Safari, Firefox) and open this page over HTTPS.')
      setHasPermission(false)
      return
    }

    try {
      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front-facing camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        ...constraints
      })

      setStream(mediaStream)
      setHasPermission(true)
      try {
        localStorage.setItem('hat-app-camera-granted', 'true')
      } catch (e) {
        // localStorage may be unavailable (private browsing, quota)
      }
      // Stream is attached and played in the useEffect when stream updates
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError(err.message || 'Failed to access camera')
      setHasPermission(false)
      try {
        localStorage.setItem('hat-app-camera-granted', 'false')
      } catch (e) {}
      
      // Provide user-friendly error messages
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access.')
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else if (err.name === 'NotReadableError') {
        setError('Camera is already in use by another application.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Attach stream to video element when stream changes (single place to avoid AbortError from competing play() calls)
  useEffect(() => {
    if (!stream || !videoRef.current) return
    const video = videoRef.current
    video.srcObject = stream
    video.play().catch(err => {
      // AbortError = play() was interrupted by a new load (e.g. React re-render); safe to ignore
      if (err?.name !== 'AbortError') {
        console.error('Error playing video:', err)
      }
    })
  }, [stream])

  return {
    stream,
    error,
    isLoading,
    hasPermission,
    videoRef,
    startCamera,
    stopCamera
  }
}

