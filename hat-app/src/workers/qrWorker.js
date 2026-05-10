/**
 * Web Worker: runs jsQR off the main thread so high-res decode doesn't block UI.
 * Receives { buffer, width, height } (buffer is transferred), tries raw then flipped, posts { code, usedFlipped }.
 */
import jsQR from 'jsqr'

function flipImageDataHorizontal(data, width, height) {
  const rowBytes = width * 4
  const row = new Uint8ClampedArray(rowBytes)
  for (let y = 0; y < height; y++) {
    const base = y * rowBytes
    row.set(data.subarray(base, base + rowBytes))
    for (let x = 0; x < width; x++) {
      const dstIdx = base + x * 4
      const srcOff = (width - 1 - x) * 4
      data[dstIdx] = row[srcOff]
      data[dstIdx + 1] = row[srcOff + 1]
      data[dstIdx + 2] = row[srcOff + 2]
      data[dstIdx + 3] = row[srcOff + 3]
    }
  }
}

const jsQROptions = { inversionAttempts: 'attemptBoth' }

self.onmessage = (e) => {
  const { buffer, width, height } = e.data
  if (!buffer || !width || !height) {
    self.postMessage({ code: null, usedFlipped: false })
    return
  }
  const data = new Uint8ClampedArray(buffer)
  let code = jsQR(data, width, height, jsQROptions)
  let usedFlipped = false
  if (!code) {
    flipImageDataHorizontal(data, width, height)
    code = jsQR(data, width, height, jsQROptions)
    usedFlipped = !!code
  }
  self.postMessage({ code, usedFlipped })
}
