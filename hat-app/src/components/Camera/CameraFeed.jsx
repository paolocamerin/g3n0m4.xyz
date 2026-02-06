import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraIcon, SidebarIcon, XIcon } from '@phosphor-icons/react'
import { useCamera } from '../../hooks/useCamera'
import { useFaceMesh } from '../../hooks/useFaceMesh'
import { useMarkerDetection, decodeQRFromImageData } from '../../hooks/useMarkerDetection'
import AROverlay from '../AROverlay/AROverlay'
import './CameraFeed.css'

/** At least 15fps for QR detection (1000/15 ≈ 66.67ms). */
const QR_CHECK_INTERVAL_MS = 66
const QR_GRACE_MS = 4000
/** Use full resolution for highest QR precision (more pixels = better small/distant QR). */
const USE_FULL_RES_FOR_QR = true
/** Request maximum resolution the device supports; jsQR receives full video frame (no downscale). */
const CAMERA_CONSTRAINTS_FULL_RES = {
  video: {
    facingMode: 'user',
    width: { ideal: 1920, max: 4096 },
    height: { ideal: 1080, max: 2160 },
  },
  audio: false,
}
/** Fallback: 720p + 30fps cap for lower power. */
const CAMERA_CONSTRAINTS_ENERGY = {
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 24, max: 30 },
  },
  audio: false,
}

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
  const [testQRResult, setTestQRResult] = useState(null)
  const [showQRDebugFrame, setShowQRDebugFrame] = useState(false)
  const [useQRTrigger, setUseQRTrigger] = useState(true)
  const [controlsOpen, setControlsOpen] = useState(false)
  const testFileInputRef = useRef(null)
  const qrDebugCanvasRef = useRef(null)
  const {
    videoRef,
    error,
    isLoading,
    hasPermission,
    startCamera,
    stopCamera,
  } = useCamera()
  const { markerDetected, payload: qrPayload, location: qrLocation, imageSize: qrImageSize } = useMarkerDetection(videoRef, {
    intervalMs: QR_CHECK_INTERVAL_MS,
    debugCanvasRef: showQRDebugFrame ? qrDebugCanvasRef : undefined,
  })
  const [particlesEnabledByMarker, setParticlesEnabledByMarker] = useState(false)
  const graceTimeoutRef = useRef(null)
  useEffect(() => {
    if (markerDetected) {
      if (graceTimeoutRef.current) {
        clearTimeout(graceTimeoutRef.current)
        graceTimeoutRef.current = null
      }
      setParticlesEnabledByMarker(true)
    } else {
      if (!graceTimeoutRef.current) {
        graceTimeoutRef.current = setTimeout(() => {
          graceTimeoutRef.current = null
          setParticlesEnabledByMarker(false)
        }, QR_GRACE_MS)
      }
    }
    return () => {
      if (graceTimeoutRef.current) clearTimeout(graceTimeoutRef.current)
    }
  }, [markerDetected])
  const { noseTip, forehead, headTop, faceDetected } = useFaceMesh(
    videoRef,
    hasPermission,
    canvasRef,
    showMeshOverlay
  )

  useEffect(() => {
    startCamera(USE_FULL_RES_FOR_QR ? CAMERA_CONSTRAINTS_FULL_RES : CAMERA_CONSTRAINTS_ENERGY)
    return () => {
      stopCamera()
    }
  }, [])

  const handleRetry = () => {
    startCamera()
  }

  const handleTakePhoto = useCallback(() => {
    const container = containerRef.current
    const camCanvas = canvasRef.current
    if (!container || !camCanvas) return

    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const w = Math.round(rect.width * dpr)
    const h = Math.round(rect.height * dpr)
    if (w <= 0 || h <= 0) return

    const off = document.createElement('canvas')
    off.width = w
    off.height = h
    const ctx = off.getContext('2d')
    if (!ctx) return

    const camW = camCanvas.width
    const camH = camCanvas.height
    if (camW && camH) {
      const scale = Math.max(w / camW, h / camH)
      const dw = camW * scale
      const dh = camH * scale
      ctx.drawImage(camCanvas, (w - dw) / 2, (h - dh) / 2, dw, dh)
    }

    const arCanvas = container.querySelector('.ar-overlay canvas')
    if (arCanvas) {
      ctx.drawImage(arCanvas, 0, 0, w, h)
    }

    off.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `ar-hat-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`, { type: 'image/png' })
      const url = URL.createObjectURL(blob)

      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare?.({ files: [file] })) {
        navigator.share({ files: [file], title: 'AR Hat Photo' }).catch(() => {
          downloadUrl(url, file.name)
        }).finally(() => URL.revokeObjectURL(url))
      } else {
        downloadUrl(url, file.name)
        URL.revokeObjectURL(url)
      }
    }, 'image/png', 1)
  }, [])

  function downloadUrl(url, filename) {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleTestQRFile = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setTestQRResult(null)
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setTestQRResult({ ok: false, error: 'No canvas 2d' })
        return
      }
      ctx.drawImage(img, 0, 0)
      let imageData
      try {
        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      } catch (err) {
        setTestQRResult({ ok: false, error: err.message || 'getImageData failed' })
        return
      }
      const code = decodeQRFromImageData(imageData.data, imageData.width, imageData.height, { tryFlipped: true })
      if (code) {
        setTestQRResult({ ok: true, payload: code.data })
        console.log('[QR test] decoded:', code.data)
      } else {
        setTestQRResult({ ok: false, error: 'No QR code found in image' })
        console.log('[QR test] no QR in image')
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      setTestQRResult({ ok: false, error: 'Failed to load image' })
    }
    img.src = url
    e.target.value = ''
  }, [])

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
      {hasPermission && qrLocation && qrImageSize && (
        <svg
          className="camera-qr-box"
          viewBox={`0 0 ${qrImageSize.width} ${qrImageSize.height}`}
          preserveAspectRatio="xMidYMid slice"
          aria-hidden
        >
          <polygon
            points={`${qrLocation.topLeftCorner.x},${qrLocation.topLeftCorner.y} ${qrLocation.topRightCorner.x},${qrLocation.topRightCorner.y} ${qrLocation.bottomRightCorner.x},${qrLocation.bottomRightCorner.y} ${qrLocation.bottomLeftCorner.x},${qrLocation.bottomLeftCorner.y}`}
            fill="none"
            stroke="rgba(74, 222, 128, 0.9)"
            strokeWidth="3"
          />
        </svg>
      )}
      {useQRTrigger && !markerDetected && hasPermission && (
        <div className="camera-qr-hint" aria-live="polite">
          Any QR code enables particles — point camera at one
        </div>
      )}
      {hasPermission && (
        <AROverlay
          containerRef={containerRef}
          noseTip={noseTip}
          forehead={forehead}
          headTop={headTop}
          cameraFov={cameraFov}
          sphereDepth={sphereDepth}
          showParticles={showParticles}
          particlesEnabledByMarker={useQRTrigger ? particlesEnabledByMarker : true}
        />
      )}
      <div className="camera-overlay">
        {hasPermission && (
          <div className="camera-overlay-actions">
            <button
              type="button"
              className="camera-capture-btn"
              onClick={handleTakePhoto}
              aria-label="Take photo"
              title="Take photo (saves to photos or downloads)"
            >
              <CameraIcon size={28} weight="regular" aria-hidden />
            </button>
            {!controlsOpen && (
              <button
                type="button"
                className="camera-controls-toggle camera-controls-toggle--closed"
                onClick={() => setControlsOpen(true)}
                aria-label="Open panel"
                title="Open panel"
              >
                <SidebarIcon size={20} weight="regular" className="camera-controls-toggle-icon" aria-hidden />
                <span>Open panel</span>
              </button>
            )}
          </div>
        )}
        <div className={`camera-controls-panel ${controlsOpen ? '' : 'camera-controls-panel--closed'}`}>
          <button
            type="button"
            className="camera-controls-toggle camera-controls-toggle--open"
            onClick={() => setControlsOpen(false)}
            aria-label="Close panel"
            title="Close panel"
          >
            <XIcon size={22} weight="regular" className="camera-controls-toggle-icon" aria-hidden />
          </button>
          <div className="status-indicator">
            {hasPermission && <span className="status-dot active"></span>}
            <span className="status-text">
              {hasPermission ? (faceDetected ? 'Face detected' : 'Camera Active') : 'Waiting...'}
            </span>
          </div>
          <div className="status-indicator camera-qr-status" aria-live="polite">
            <span className={`status-dot ${markerDetected ? 'active' : ''}`} />
            <span className="status-text">
              QR: {markerDetected ? `detected${qrPayload ? ` — "${qrPayload.length > 20 ? qrPayload.slice(0, 20) + '…' : qrPayload}"` : ''}` : 'none'}
            </span>
          </div>
          <div className="camera-qr-test">
            <input
              ref={testFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleTestQRFile}
              className="camera-qr-test-input"
              aria-label="Test QR with image file"
            />
            <button
              type="button"
              className="camera-qr-test-btn"
              onClick={() => testFileInputRef.current?.click()}
            >
              Test QR with image file
            </button>
            {testQRResult && (
              <div className={`camera-qr-test-result ${testQRResult.ok ? 'ok' : 'err'}`}>
                {testQRResult.ok ? `Decoded: ${testQRResult.payload}` : testQRResult.error}
              </div>
            )}
          </div>
          <label className="mesh-toggle" title="Show the raw frame we send to QR decoder (for troubleshooting)">
            <input
              type="checkbox"
              checked={showQRDebugFrame}
              onChange={(e) => setShowQRDebugFrame(e.target.checked)}
              aria-label="Show QR debug frame"
            />
            <span
              className={`mesh-toggle-track ${showQRDebugFrame ? 'on' : ''}`}
              aria-hidden
            >
              <span className="mesh-toggle-thumb" />
            </span>
            <span>Show QR debug frame</span>
          </label>
          {showQRDebugFrame && (
            <div className="camera-qr-debug-wrap">
              <canvas ref={qrDebugCanvasRef} className="camera-qr-debug-canvas" title="Raw frame sent to jsQR" />
              <span className="camera-qr-debug-label">Raw frame sent to jsQR (updates every 1s)</span>
            </div>
          )}
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
          <label className="mesh-toggle" title="Require QR code in view to emit particles; off = particles always on when enabled">
            <input
              type="checkbox"
              checked={useQRTrigger}
              onChange={(e) => setUseQRTrigger(e.target.checked)}
              aria-label="Require QR for particles"
            />
            <span
              className={`mesh-toggle-track ${useQRTrigger ? 'on' : ''}`}
              aria-hidden
            >
              <span className="mesh-toggle-thumb" />
            </span>
            <span>QR trigger</span>
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

