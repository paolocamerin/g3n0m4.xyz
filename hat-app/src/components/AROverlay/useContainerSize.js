import { useState, useEffect } from 'react'

export function useContainerSize(containerRef) {
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = containerRef?.current
    if (!el) return

    const update = () => {
      const rect = el.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(el)

    let orientationTimeoutId = null
    const onOrientationChange = () => {
      requestAnimationFrame(() => requestAnimationFrame(update))
      if (orientationTimeoutId) clearTimeout(orientationTimeoutId)
      orientationTimeoutId = setTimeout(update, 150)
    }
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', onOrientationChange)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', onOrientationChange)
      if (orientationTimeoutId) clearTimeout(orientationTimeoutId)
    }
  }, [containerRef])

  return size
}
