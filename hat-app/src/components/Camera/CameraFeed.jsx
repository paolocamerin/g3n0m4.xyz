import { useEffect } from 'react'
import { useCamera } from '../../hooks/useCamera'
import './CameraFeed.css'

export default function CameraFeed() {
  const { 
    videoRef, 
    error, 
    isLoading, 
    hasPermission, 
    startCamera, 
    stopCamera 
  } = useCamera()

  useEffect(() => {
    // Start camera when component mounts
    startCamera()

    // Cleanup on unmount
    return () => {
      stopCamera()
    }
  }, [])

  const handleRetry = () => {
    startCamera()
  }

  if (error) {
    return (
      <div className="camera-error">
        <div className="error-content">
          <h2>Camera Access Error</h2>
          <p>{error}</p>
          <button onClick={handleRetry} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="camera-loading">
        <div className="loading-spinner"></div>
        <p>Requesting camera access...</p>
      </div>
    )
  }

  return (
    <div className="camera-container">
      <video
        ref={videoRef}
        className="camera-video"
        autoPlay
        playsInline
        muted
      />
      <div className="camera-overlay">
        <div className="status-indicator">
          {hasPermission && <span className="status-dot active"></span>}
          <span className="status-text">
            {hasPermission ? 'Camera Active' : 'Waiting...'}
          </span>
        </div>
      </div>
    </div>
  )
}

