import { useEffect, useRef, useState } from 'react'
import { useCamera } from '../../hooks/useCamera'
import { useFaceMesh } from '../../hooks/useFaceMesh'
import AROverlay from '../AROverlay/AROverlay'
import './CameraFeed.css'

// When QR/token is implemented, this will be driven by that; for now always show effect.
const showEffect = true

const FOV_MIN = 40
const FOV_MAX = 180
const DEPTH_MIN = 0.3
const DEPTH_MAX = 2.5

export default function CameraFeed() {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [showMeshOverlay, setShowMeshOverlay] = useState(true)
  const [showParticles, setShowParticles] = useState(true)
  const [cameraFov, setCameraFov] = useState(90)   // good default for mobile
  const [sphereDepth, setSphereDepth] = useState(0.95)
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
        <AROverlay
          containerRef={containerRef}
          noseTip={noseTip}
          cameraFov={cameraFov}
          sphereDepth={sphereDepth}
          showParticles={showParticles}
        />
      )}
      <div className="camera-overlay">
        <div className="camera-controls-panel">
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
          <label className="mesh-toggle" title="Enable or disable particle emission">
            <input
              type="checkbox"
              checked={showParticles}
              onChange={(e) => setShowParticles(e.target.checked)}
              aria-label="Show particles"
            />
            <span
              className={`mesh-toggle-track ${showParticles ? 'on' : ''}`}
              aria-hidden
            >
              <span className="mesh-toggle-thumb" />
            </span>
            <span>Particles</span>
          </label>
          <div className="ar-controls">
            <div className="ar-control">
              <label>
                <span className="ar-control-label">FOV</span>
                <span className="ar-control-value" aria-live="polite">{cameraFov}°</span>
              </label>
              <input
                type="range"
                min={FOV_MIN}
                max={FOV_MAX}
                value={cameraFov}
                onChange={(e) => setCameraFov(Number(e.target.value))}
                aria-label="Camera field of view (degrees)"
                className="ar-slider"
              />
            </div>
            <div className="ar-control" title="Distance of sphere from camera (z = −depth). Nose-tip landmark.">
              <label>
                <span className="ar-control-label">Sphere depth</span>
                <span className="ar-control-value" aria-live="polite">{sphereDepth.toFixed(2)}</span>
              </label>
              <input
                type="range"
                min={DEPTH_MIN}
                max={DEPTH_MAX}
                step={0.05}
                value={sphereDepth}
                onChange={(e) => setSphereDepth(Number(e.target.value))}
                aria-label="Sphere depth (distance from camera)"
                className="ar-slider"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

