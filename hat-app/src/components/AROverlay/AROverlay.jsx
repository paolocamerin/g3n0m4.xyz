import { Suspense, useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useContainerSize } from './useContainerSize'
import './AROverlay.css'

/** Set to your GLTF path (under base, e.g. 'models/scene.gltf') to use random objects as particles; undefined = spheres. */
const PARTICLE_MODEL_URL = `${import.meta.env.BASE_URL}models/scene.gltf`

/**
 * 3D model credit (copy-paste wherever you share the project):
 * This work is based on "Low Poly Fruits Pack" (https://sketchfab.com/3d-models/low-poly-fruits-pack-79e79bc5c1e942a88c281b8baaf3c04d) by PerfectioNH (https://sketchfab.com/PerfectioNH3) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)
 */

const PARTICLE_COUNT = 80
const PARTICLE_RADIUS = 0.05
const GRAVITY = -1.8
const RECYCLE_Y = -3
const EMIT_SPREAD = 0.08
const INIT_VX_SPREAD = 1
const INIT_VY_SPREAD = 1  // higher y velocity for initial upward motion
const HEAD_OFFSET_Y = 0.38 // higher = spawn on top of head (landmark y is smaller above)
const EMIT_DEPTH_OFFSET = 0.25 // added to sphereDepth so spawn is deeper into scene
const EMIT_RATE = 30 // particles per second

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

/**
 * Particle system: spheres emitted above the head, fall with gravity, recycled when below view.
 * Uses individual meshes (same path as nose sphere) so rendering is reliable across devices.
 * Particles are emitted continuously at EMIT_RATE per second (not all at once).
 */
function WaterfallParticles({ emitPosition, count = PARTICLE_COUNT, enabled = true }) {
  const groupRef = useRef(null)
  const positions = useRef(new Float32Array(count * 3))
  const velocities = useRef(new Float32Array(count * 3))
  const active = useRef(new Uint8Array(count)) // 0 = inactive, 1 = active
  const emitAccum = useRef(0)
  const nextToEmit = useRef(0)
  const emitRef = useRef(emitPosition)
  const enabledRef = useRef(enabled)

  emitRef.current = emitPosition
  enabledRef.current = enabled

  // Initialize all particles as inactive (behind camera)
  useEffect(() => {
    const pos = positions.current
    const vel = velocities.current
    const act = active.current
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0
      pos[i * 3 + 1] = RECYCLE_Y - 1
      pos[i * 3 + 2] = -100
      vel[i * 3] = 0
      vel[i * 3 + 1] = 0
      vel[i * 3 + 2] = 0
      act[i] = 0
    }
    emitAccum.current = 0
    nextToEmit.current = 0
  }, [count])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const dt = Math.min(delta, 0.1)
    const pos = positions.current
    const vel = velocities.current
    const act = active.current

    // When disabled, hide all particles immediately
    if (!enabledRef.current) {
      for (let i = 0; i < count; i++) {
        act[i] = 0
        pos[i * 3 + 2] = -100
      }
    }

    // Emit new particles if enabled
    if (enabledRef.current) {
      const emit = emitRef.current
      const ex = emit ? emit[0] : 0
      const ey = emit ? emit[1] : 0.5
      const ez = emit ? emit[2] : -1

      emitAccum.current += dt
      const emitInterval = 1 / EMIT_RATE
      while (emitAccum.current >= emitInterval) {
        emitAccum.current -= emitInterval
        const i = nextToEmit.current
        pos[i * 3] = ex + (Math.random() - 0.5) * EMIT_SPREAD
        pos[i * 3 + 1] = ey + Math.random() * EMIT_SPREAD * 0.5
        pos[i * 3 + 2] = ez + (Math.random() - 0.5) * EMIT_SPREAD
        vel[i * 3] = (Math.random() - 0.5) * INIT_VX_SPREAD
        vel[i * 3 + 1] = (1 + Math.random()) * INIT_VY_SPREAD
        vel[i * 3 + 2] = 0
        act[i] = 1
        nextToEmit.current = (nextToEmit.current + 1) % count
      }
    }

    // Update physics for active particles
    for (let i = 0; i < count; i++) {
      if (act[i]) {
        vel[i * 3 + 1] += GRAVITY * dt
        pos[i * 3] += vel[i * 3] * dt
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt
        if (pos[i * 3 + 1] < RECYCLE_Y) {
          act[i] = 0
          pos[i * 3 + 2] = -100
        }
      }

      // Update mesh position and visibility (same rendering as nose sphere)
      const mesh = group.children[i]
      if (mesh) {
        mesh.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
        mesh.scale.setScalar(act[i] ? PARTICLE_RADIUS : 0)
        mesh.visible = true
      }
    }
  })

  // One mesh per particle – same declarative setup as the green nose sphere
  return (
    <group ref={groupRef}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color="#7dd3fc" />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Same as WaterfallParticles but uses a GLTF with many objects: each particle
 * is assigned one of those objects at random. Requires modelUrl (e.g. '/models/particles.gltf').
 */
function WaterfallParticlesGLTF({
  modelUrl,
  emitPosition,
  count = PARTICLE_COUNT,
  enabled = true,
}) {
  const gltf = useGLTF(modelUrl)
  const groupRef = useRef(null)
  const positions = useRef(new Float32Array(count * 3))
  const velocities = useRef(new Float32Array(count * 3))
  const active = useRef(new Uint8Array(count))
  const emitAccum = useRef(0)
  const nextToEmit = useRef(0)
  const emitRef = useRef(emitPosition)
  const enabledRef = useRef(enabled)

  emitRef.current = emitPosition
  enabledRef.current = enabled

  // Group meshes by parent so each "object" (e.g. whole banana) is one particle, not individual pieces.
  // Normalize scale per object so watermelon (big in GLTF) and banana (small in GLTF) appear comparable.
  const meshData = useMemo(() => {
    if (!gltf?.scene) return null
    const byParent = new Map()
    gltf.scene.traverse((node) => {
      if (node.isMesh && node.geometry && node.material) {
        const key = node.parent?.uuid ?? node.uuid
        if (!byParent.has(key)) byParent.set(key, [])
        byParent.get(key).push({
          geometry: node.geometry,
          material: Array.isArray(node.material) ? node.material[0] : node.material,
          position: node.position.clone(),
          quaternion: node.quaternion.clone(),
          scale: node.scale.clone(),
        })
      }
    })
    const objects = Array.from(byParent.values()).filter((arr) => arr.length > 0)
    if (objects.length === 0) return null

    // Per-object size (max extent) so we can normalize: big models get smaller scale, small models get larger scale
    const normalizeScales = objects.map((obj) => {
      let maxRadius = 0
      for (const m of obj) {
        if (!m.geometry.boundingSphere?.radius) m.geometry.computeBoundingSphere()
        const r = m.geometry.boundingSphere.radius*.5
        const s = Math.max(m.scale.x, m.scale.y, m.scale.z)
        maxRadius = Math.max(maxRadius, r * s)
      }
      return maxRadius > 0 ? 1 / maxRadius : 1
    })

    return { objects, count: objects.length, normalizeScales }
  }, [gltf])

  const variantIndices = useMemo(() => {
    if (!meshData) return []
    return Array.from({ length: count }, () =>
      Math.floor(Math.random() * meshData.count)
    )
  }, [meshData, count])

  useEffect(() => {
    const pos = positions.current
    const vel = velocities.current
    const act = active.current
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0
      pos[i * 3 + 1] = RECYCLE_Y - 1
      pos[i * 3 + 2] = -100
      vel[i * 3] = 0
      vel[i * 3 + 1] = 0
      vel[i * 3 + 2] = 0
      act[i] = 0
    }
    emitAccum.current = 0
    nextToEmit.current = 0
  }, [count])

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return

    const dt = Math.min(delta, 0.1)
    const pos = positions.current
    const vel = velocities.current
    const act = active.current

    if (!enabledRef.current) {
      for (let i = 0; i < count; i++) {
        act[i] = 0
        pos[i * 3 + 2] = -100
      }
    }

    if (enabledRef.current) {
      const emit = emitRef.current
      const ex = emit ? emit[0] : 0
      const ey = emit ? emit[1] : 0.5
      const ez = emit ? emit[2] : -1

      emitAccum.current += dt
      const emitInterval = 1 / EMIT_RATE
      while (emitAccum.current >= emitInterval) {
        emitAccum.current -= emitInterval
        const i = nextToEmit.current
        pos[i * 3] = ex + (Math.random() - 0.5) * EMIT_SPREAD
        pos[i * 3 + 1] = ey + Math.random() * EMIT_SPREAD * 0.5
        pos[i * 3 + 2] = ez + (Math.random() - 0.5) * EMIT_SPREAD
        vel[i * 3] = (Math.random() - 0.5) * INIT_VX_SPREAD
        vel[i * 3 + 1] = (1 + Math.random()) * INIT_VY_SPREAD
        vel[i * 3 + 2] = 0
        act[i] = 1
        nextToEmit.current = (nextToEmit.current + 1) % count
      }
    }

    for (let i = 0; i < count; i++) {
      if (act[i]) {
        vel[i * 3 + 1] += GRAVITY * dt
        pos[i * 3] += vel[i * 3] * dt
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt
        if (pos[i * 3 + 1] < RECYCLE_Y) {
          act[i] = 0
          pos[i * 3 + 2] = -100
        }
      }

      const particleGroup = group.children[i]
      if (particleGroup) {
        particleGroup.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
        const v = variantIndices[i]
        const norm = meshData.normalizeScales[v] ?? 1
        particleGroup.scale.setScalar(act[i] ? PARTICLE_RADIUS * norm : 0)
        particleGroup.visible = true
      }
    }
  })

  if (!meshData || variantIndices.length !== count) return null

  return (
    <group ref={groupRef}>
      {Array.from({ length: count }, (_, i) => {
        const v = variantIndices[i]
        const object = meshData.objects[v]
        return (
          <group key={i}>
            {object.map((m, j) => (
              <mesh
                key={j}
                geometry={m.geometry}
                material={m.material}
                position={m.position}
                quaternion={m.quaternion}
                scale={m.scale}
              />
            ))}
          </group>
        )
      })}
    </group>
  )
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

function Scene({ noseTip, aspect, cameraFov, sphereDepth, sphereZScale, showParticles }) {
  const emitPosition = useMemo(() => {
    if (!noseTip) return null
    const aboveHead = { x: noseTip.x, y: noseTip.y - HEAD_OFFSET_Y, z: noseTip.z }
    return landmarkToPosition(aboveHead, aspect, sphereDepth + EMIT_DEPTH_OFFSET, sphereZScale)
  }, [noseTip?.x, noseTip?.y, noseTip?.z, aspect, sphereDepth, sphereZScale])

  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight
        position={[0.5, 1.5, 1]}
        intensity={4}
        castShadow={false}
      />
      <pointLight position={[0, 0.5, 0.5]} intensity={1.5} distance={5} />
      <CameraFovSync fov={cameraFov} />
      <SphereAtLandmark
        noseTip={noseTip}
        aspect={aspect}
        sphereDepth={sphereDepth}
        sphereZScale={sphereZScale}
      />
      {PARTICLE_MODEL_URL ? (
        <Suspense fallback={null}>
          <WaterfallParticlesGLTF
            modelUrl={PARTICLE_MODEL_URL}
            emitPosition={emitPosition}
            enabled={showParticles}
          />
        </Suspense>
      ) : (
        <WaterfallParticles emitPosition={emitPosition} enabled={showParticles} />
      )}
    </>
  )
}

export default function AROverlay({
  containerRef,
  noseTip,
  cameraFov = 65,
  sphereDepth = 1,
  sphereZScale = 0.3,
  showParticles = true,
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
          showParticles={showParticles}
        />
      </Canvas>
    </div>
  )
}
