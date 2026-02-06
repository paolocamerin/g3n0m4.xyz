import { Suspense, useRef, useMemo, useEffect, useState } from 'react'
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
/** Fewer particles on touch devices to save GPU/CPU and reduce heat. */
const PARTICLE_COUNT_MOBILE = 40
const PARTICLE_RADIUS = 0.05
const GRAVITY = -1.8
const RECYCLE_Y = -3
const EMIT_SPREAD = 0.08
const INIT_VX_SPREAD = 1
const INIT_VY_SPREAD = 1  // higher y velocity for initial upward motion
const EMIT_DEPTH_OFFSET = 0.25 // added to sphereDepth so spawn is deeper into scene
const EMIT_Y_OFFSET = .25 // add to spawn Y: positive = higher, negative = lower
const EMIT_Y_MAX = 1.0 // clamp spawn Y so tilting head up doesn't push particles off screen
const EMIT_TILT_Y_DAMP = 0.5 // when head tilts up, lower ceiling by this * tiltUpFactor (0..1)
const EMIT_RATE = 30 // particles per second
const ANGULAR_VELOCITY = 2.0 // rad/s per axis for subtle tumbling (random per particle)

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

function CameraAspectSync({ aspect }) {
  const { camera } = useThree()
  useEffect(() => {
    camera.aspect = aspect
    camera.updateProjectionMatrix()
  }, [camera, aspect])
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
  const rotations = useRef(new Float32Array(count * 3)) // euler x, y, z per particle
  const angularVelocities = useRef(new Float32Array(count * 3))
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
    const rot = rotations.current
    const avel = angularVelocities.current
    const act = active.current
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0
      pos[i * 3 + 1] = RECYCLE_Y - 1
      pos[i * 3 + 2] = -100
      vel[i * 3] = 0
      vel[i * 3 + 1] = 0
      vel[i * 3 + 2] = 0
      rot[i * 3] = 0
      rot[i * 3 + 1] = 0
      rot[i * 3 + 2] = 0
      avel[i * 3] = 0
      avel[i * 3 + 1] = 0
      avel[i * 3 + 2] = 0
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
    const rot = rotations.current
    const avel = angularVelocities.current
    const act = active.current

    // Emit new particles only when enabled and face detected (emit position set).
    // When disabled we only stop emission; existing particles keep falling until they recycle.
    if (enabledRef.current && emitRef.current) {
      const emit = emitRef.current
      const ex = emit[0]
      const ey = emit[1]
      const ez = emit[2]

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
        avel[i * 3] = (Math.random() - 0.5) * ANGULAR_VELOCITY
        avel[i * 3 + 1] = (Math.random() - 0.5) * ANGULAR_VELOCITY
        avel[i * 3 + 2] = (Math.random() - 0.5) * ANGULAR_VELOCITY
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
        rot[i * 3] += avel[i * 3] * dt
        rot[i * 3 + 1] += avel[i * 3 + 1] * dt
        rot[i * 3 + 2] += avel[i * 3 + 2] * dt
        if (pos[i * 3 + 1] < RECYCLE_Y) {
          act[i] = 0
          pos[i * 3 + 2] = -100
        }
      }

      // Update mesh position, rotation, and visibility
      const mesh = group.children[i]
      if (mesh) {
        mesh.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
        mesh.rotation.set(rot[i * 3], rot[i * 3 + 1], rot[i * 3 + 2])
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
  const rotations = useRef(new Float32Array(count * 3))
  const angularVelocities = useRef(new Float32Array(count * 3))
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
    const rot = rotations.current
    const avel = angularVelocities.current
    const act = active.current
    for (let i = 0; i < count; i++) {
      pos[i * 3] = 0
      pos[i * 3 + 1] = RECYCLE_Y - 1
      pos[i * 3 + 2] = -100
      vel[i * 3] = 0
      vel[i * 3 + 1] = 0
      vel[i * 3 + 2] = 0
      rot[i * 3] = 0
      rot[i * 3 + 1] = 0
      rot[i * 3 + 2] = 0
      avel[i * 3] = 0
      avel[i * 3 + 1] = 0
      avel[i * 3 + 2] = 0
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
    const rot = rotations.current
    const avel = angularVelocities.current
    const act = active.current

    // When disabled we only stop emission; existing particles keep falling until they recycle.
    if (enabledRef.current && emitRef.current) {
      const emit = emitRef.current
      const ex = emit[0]
      const ey = emit[1]
      const ez = emit[2]

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
        avel[i * 3] = (Math.random() - 0.5) * ANGULAR_VELOCITY
        avel[i * 3 + 1] = (Math.random() - 0.5) * ANGULAR_VELOCITY
        avel[i * 3 + 2] = (Math.random() - 0.5) * ANGULAR_VELOCITY
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
        rot[i * 3] += avel[i * 3] * dt
        rot[i * 3 + 1] += avel[i * 3 + 1] * dt
        rot[i * 3 + 2] += avel[i * 3 + 2] * dt
        if (pos[i * 3 + 1] < RECYCLE_Y) {
          act[i] = 0
          pos[i * 3 + 2] = -100
        }
      }

      const particleGroup = group.children[i]
      if (particleGroup) {
        particleGroup.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2])
        particleGroup.rotation.set(rot[i * 3], rot[i * 3 + 1], rot[i * 3 + 2])
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

function Scene({ noseTip, forehead, headTop, aspect, cameraFov, sphereDepth, sphereZScale, showParticles, particlesEnabledByMarker, particleCount }) {
  // Spawn position: use forehead + headTop (top of head) when available; fallback to nose + offset
  const emitPosition = useMemo(() => {
    const topOfHead = forehead && headTop
      ? { x: (forehead.x + headTop.x) / 2, y: (forehead.y + headTop.y) / 2, z: (forehead.z + headTop.z) / 2 }
      : forehead
        ? { x: forehead.x, y: forehead.y, z: forehead.z }
        : noseTip
          ? { x: noseTip.x, y: noseTip.y - HEAD_OFFSET_Y, z: noseTip.z }
          : null
    if (!topOfHead) return null
    const pos = landmarkToPosition(topOfHead, aspect, sphereDepth + EMIT_DEPTH_OFFSET, sphereZScale)
    if (!pos) return null
    pos[1] += EMIT_Y_OFFSET
    // Tilt from nose→forehead: when head tilts up, forehead.y < nose.y so (nose.y - forehead.y) is positive
    const tiltUpFactor = noseTip && forehead
      ? Math.max(0, Math.min(1, (noseTip.y - forehead.y) * 2))
      : 0
    const effectiveMaxY = EMIT_Y_MAX - tiltUpFactor * EMIT_TILT_Y_DAMP
    pos[1] = Math.min(pos[1], effectiveMaxY)
    return pos
  }, [noseTip?.x, noseTip?.y, noseTip?.z, forehead?.x, forehead?.y, forehead?.z, headTop?.x, headTop?.y, headTop?.z, aspect, sphereDepth, sphereZScale])

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
      <CameraAspectSync aspect={aspect} />
      {PARTICLE_MODEL_URL ? (
        <Suspense fallback={null}>
          <WaterfallParticlesGLTF
            modelUrl={PARTICLE_MODEL_URL}
            emitPosition={emitPosition}
            count={particleCount}
            enabled={showParticles && particlesEnabledByMarker}
          />
        </Suspense>
      ) : (
        <WaterfallParticles emitPosition={emitPosition} count={particleCount} enabled={showParticles && particlesEnabledByMarker} />
      )}
    </>
  )
}

function useParticleCount() {
  return useMemo(() => {
    if (typeof navigator === 'undefined') return PARTICLE_COUNT
    const isMobile = navigator.maxTouchPoints > 0 || /iPhone|iPad|Android/i.test(navigator.userAgent)
    return isMobile ? PARTICLE_COUNT_MOBILE : PARTICLE_COUNT
  }, [])
}

function usePageVisible() {
  const [visible, setVisible] = useState(() => (typeof document !== 'undefined' ? document.visibilityState === 'visible' : true))
  useEffect(() => {
    const onVisibilityChange = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])
  return visible
}

export default function AROverlay({
  containerRef,
  noseTip,
  forehead,
  headTop,
  cameraFov = 65,
  sphereDepth = 1,
  sphereZScale = 0.3,
  showParticles = true,
  particlesEnabledByMarker = true,
}) {
  const size = useContainerSize(containerRef)
  const aspect = size.width > 0 ? size.width / size.height : 16 / 9
  const particleCount = useParticleCount()
  const isPageVisible = usePageVisible()

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
        frameloop={isPageVisible ? 'always' : 'never'}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
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
          forehead={forehead}
          headTop={headTop}
          aspect={aspect}
          cameraFov={cameraFov}
          sphereDepth={sphereDepth}
          sphereZScale={sphereZScale}
          showParticles={showParticles}
          particlesEnabledByMarker={particlesEnabledByMarker}
          particleCount={particleCount}
        />
      </Canvas>
    </div>
  )
}
