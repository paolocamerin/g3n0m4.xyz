import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useContainerSize } from './useContainerSize'
import './AROverlay.css'

/**
 * Converts MediaPipe landmark (x, y in [0,1], z relative depth) to Three.js world position.
 * Camera is at origin looking at -Z. We flip x so the sphere matches the mirrored selfie view.
 */
function landmarkToPosition(landmark, aspect) {
  if (!landmark) return null
  const scale = 1.2
  const depth = 1
  return [
    (0.5 - landmark.x) * 2 * scale * aspect, // flip x for mirrored view
    (0.5 - landmark.y) * 2 * scale,
    -depth + (landmark.z ?? 0) * 0.3,
  ]
}

function SphereAtLandmark({ noseTip, aspect }) {
  const meshRef = useRef()
  const position = useMemo(
    () => landmarkToPosition(noseTip, aspect),
    [noseTip?.x, noseTip?.y, noseTip?.z, aspect]
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

function Scene({ noseTip, aspect }) {
  return (
    <>
      <SphereAtLandmark noseTip={noseTip} aspect={aspect} />
    </>
  )
}

export default function AROverlay({ containerRef, noseTip }) {
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
          fov: 65, // typical front-facing webcam vertical FOV (~60–70°)
          near: 0.1,
          far: 10,
          aspect: aspect,
        }}
        style={{ width: size.width, height: size.height }}
      >
        <Scene noseTip={noseTip} aspect={aspect} />
      </Canvas>
    </div>
  )
}
