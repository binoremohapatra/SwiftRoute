import { useEffect, useRef } from 'react'

/**
 * AnimatedCounter — uses requestAnimationFrame for smooth count-up.
 * Falls back to plain text if JS not ready.
 */
export default function AnimatedCounter({ value, duration = 1000, suffix = '', prefix = '' }) {
  const ref = useRef(null)
  const startVal = useRef(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (ref.current === null) return
    const end = parseFloat(value) || 0
    const start = startVal.current
    const startTime = performance.now()

    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const current = start + (end - start) * ease(progress)
      
      const isDecimal = String(end).includes('.')
      ref.current.textContent = prefix + (isDecimal ? current.toFixed(1) : Math.floor(current)) + suffix
      
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        startVal.current = end
      }
    }

    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration, suffix, prefix])

  return <span ref={ref}>{prefix}{value}{suffix}</span>
}
