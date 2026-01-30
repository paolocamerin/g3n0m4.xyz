import {
  FACEMESH_CONTOURS,
  FACEMESH_TESSELATION,
} from '@mediapipe/face_mesh'

/**
 * Draw connector lines between landmarks on a 2D canvas context.
 * Landmarks are normalized (x, y in [0, 1]); we scale by width/height.
 */
export function drawConnectors(ctx, landmarks, connections, width, height, style = {}) {
  if (!landmarks?.length || !connections?.length) return
  const { color = '#00ff00', lineWidth = 1 } = style
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  for (const [i, j] of connections) {
    const a = landmarks[i]
    const b = landmarks[j]
    if (!a || !b) continue
    ctx.moveTo(a.x * width, a.y * height)
    ctx.lineTo(b.x * width, b.y * height)
  }
  ctx.stroke()
}

/**
 * Draw the full face mesh (contours + tesselation) for debug visualization.
 * Use contours only for a lighter overlay.
 */
export function drawFaceMesh(ctx, multiFaceLandmarks, width, height, options = {}) {
  const { contours = true, tesselation = false } = options
  if (!multiFaceLandmarks?.length) return
  for (const landmarks of multiFaceLandmarks) {
    if (contours) {
      drawConnectors(ctx, landmarks, FACEMESH_CONTOURS, width, height, {
        color: 'rgba(0, 255, 128, 0.6)',
        lineWidth: 1,
      })
    }
    if (tesselation) {
      drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, width, height, {
        color: 'rgba(200, 200, 200, 0.3)',
        lineWidth: 0.5,
      })
    }
  }
}
