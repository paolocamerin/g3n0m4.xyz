import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../../hooks/useCamera'
import { useFaceMesh } from '../../hooks/useFaceMesh'
import AROverlay from '../AROverlay/AROverlay'
import './CameraFeed.css'

// When QR/token is implemented, this will be driven by that; for now always show effect.
const showEffect = true

export default function CameraFeed() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [showMeshOverlay, setShowMeshOverlay] = useState(true)
  const {
    videoRef,
    error,
    isLoading,
    hasPermission,
    startCamera,
    stopCamera,
  } = useCamera()
  const { noseTip, faceDetected } = useFaceMesh(
    videoRef,
    showEffect && hasPermission,
    canvasRef,
    showMeshOverlay
  )

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
    <div className="camera-container" ref={containerRef}>
      {/* Video is hidden but still feeds MediaPipe; canvas shows camera + mesh from MediaPipe */}
      <video
        ref={videoRef}
        className="camera-video camera-video--hidden"
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className="camera-canvas"
        aria-label="Camera feed with face mesh overlay"
      />
      {showEffect && (
        <AROverlay containerRef={containerRef} noseTip={noseTip} />
      )}
      <div className="camera-overlay">
        <div className="status-indicator">
          {hasPermission && <span className="status-dot active"></span>}
          <span className="status-text">
            {hasPermission ? (faceDetected ? 'Face detected' : 'Camera Active') : 'Waiting...'}
          </span>
        </div>
        <label className="mesh-toggle" title="Show or hide face mesh overlay">
          <input
            type="checkbox"
            checked={showMeshOverlay}
            onChange={(e) => setShowMeshOverlay(e.target.checked)}
            aria-label="Show face mesh overlay"
          />
          <span
            className={`mesh-toggle-track ${showMeshOverlay ? 'on' : ''}`}
            aria-hidden
          >
            <span className="mesh-toggle-thumb" />
          </span>
          <span>Show mesh</span>
        </label>
      </div>
    </div>
  )
}

