import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useContainerSize } from './useContainerSize'
import './AROverlay.css'

/**
 * Converts MediaPipe landmark (x, y in [0,1], z relative depth) to Three.js world position.
 * Camera is at origin looking at -Z. We flip x so the sphere matches the mirrored selfie view.
 * depth = distance in front of camera (positive = further away, z = -depth).
 * zScale = multiplier for landmark.z (MediaPipe z: smaller = closer to camera).
 */
function landmarkToPosition(landmark, aspect, depth = 1, zScale = 0.3) {
  if (!landmark) return null
  const scale = 1.2
  return [
    (0.5 - landmark.x) * 2 * scale * aspect, // flip x for mirrored view
    (0.5 - landmark.y) * 2 * scale,
    -depth + (landmark.z ?? 0) * zScale,
  ]
}

function CameraFovSync({ fov }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.fov = fov
    camera.updateProjectionMatrix()
  }, [camera, fov])
  return null
}

function SphereAtLandmark({ noseTip, aspect, sphereDepth, sphereZScale }) {
  const meshRef = useRef()
  const position = useMemo(
    () =>
      landmarkToPosition(noseTip, aspect, sphereDepth, sphereZScale),
    [noseTip?.x, noseTip?.y, noseTip?.z, aspect, sphereDepth, sphereZScale]
  )

  useFrame(() => {
    if (meshRef.current && position) {
      meshRef.current.position.set(position[0], position[1], position[2])
    }
  })

  if (!position) return null

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.05, 16, 16]} />
      <meshBasicMaterial color="#4ade80" />
    </mesh>
  )
}

function Scene({ noseTip, aspect, cameraFov, sphereDepth, sphereZScale }) {
  return (
    <>
      <CameraFovSync fov={cameraFov} />
      <SphereAtLandmark
        noseTip={noseTip}
        aspect={aspect}
        sphereDepth={sphereDepth}
        sphereZScale={sphereZScale}
      />
    </>
  )
}

export default function AROverlay({
  containerRef,
  noseTip,
  cameraFov = 65,
  sphereDepth = 1,
  sphereZScale = 0.3,
}) {
  const size = useContainerSize(containerRef)
  const aspect = size.width > 0 ? size.width / size.height : 16 / 9

  if (size.width === 0 || size.height === 0) return null

  return (
    <div
      className="ar-overlay"
      style={{
        width: size.width,
        height: size.height,
      }}
      aria-hidden
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{
          position: [0, 0, 0],
          fov: cameraFov,
          near: 0.1,
          far: 10,
          aspect: aspect,
        }}
        style={{ width: size.width, height: size.height }}
      >
        <Scene
          noseTip={noseTip}
          aspect={aspect}
          cameraFov={cameraFov}
          sphereDepth={sphereDepth}
          sphereZScale={sphereZScale}
        />
      </Canvas>
    </div>
  )
}
