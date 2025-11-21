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

      // Attach stream to video element if ref exists
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        videoRef.current.play()
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError(err.message || 'Failed to access camera')
      setHasPermission(false)
      
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

  // Attach stream to video element when stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err)
      })
    }
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

