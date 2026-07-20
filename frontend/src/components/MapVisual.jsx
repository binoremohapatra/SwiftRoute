import { useEffect, useRef } from 'react'

// SVG icons for map cards (no emojis)
const LiveIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
  </svg>
)
const TruckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
    <rect x="9" y="11" width="14" height="10" rx="2" />
    <circle cx="12" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
  </svg>
)
const UsersIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const routePoints = [
  { x: 80, y: 280 },
  { x: 140, y: 230 },
  { x: 200, y: 190 },
  { x: 265, y: 210 },
  { x: 310, y: 160 },
  { x: 370, y: 130 },
  { x: 420, y: 100 },
]

const getPointAtProgress = (t) => {
  const segments = routePoints.length - 1
  const seg = Math.floor(t * segments)
  const segT = (t * segments) - seg
  const a = routePoints[Math.min(seg, routePoints.length - 1)]
  const b = routePoints[Math.min(seg + 1, routePoints.length - 1)]
  return {
    x: a.x + (b.x - a.x) * segT,
    y: a.y + (b.y - a.y) * segT,
  }
}

export default function MapVisual() {
  const markerRef = useRef(null)
  const dotRef = useRef(null)
  const trailRef = useRef(null)

  useEffect(() => {
    let animId
    let progress = 0
    let direction = 1
    let speed = 0.0008

    const animate = () => {
      progress += speed * direction

      if (progress >= 1) {
        progress = 1
        setTimeout(() => { direction = -1 }, 2000)
      }
      if (progress <= 0) {
        progress = 0
        setTimeout(() => { direction = 1 }, 1000)
      }

      const pt = getPointAtProgress(progress)

      if (markerRef.current) {
        markerRef.current.setAttribute('cx', pt.x)
        markerRef.current.setAttribute('cy', pt.y)
      }
      if (dotRef.current) {
        dotRef.current.setAttribute('cx', pt.x)
        dotRef.current.setAttribute('cy', pt.y)
      }

      if (trailRef.current) {
        const trailSegments = Math.floor(progress * (routePoints.length - 1))
        let d = ''
        for (let i = 0; i <= trailSegments; i++) {
          const tp = getPointAtProgress(i / (routePoints.length - 1))
          d += i === 0 ? `M ${tp.x} ${tp.y}` : ` L ${tp.x} ${tp.y}`
        }
        d += ` L ${pt.x} ${pt.y}`
        trailRef.current.setAttribute('d', d)
      }

      animId = requestAnimationFrame(animate)
    }

    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [])

  const cities = [
    { x: 80, y: 280, color: '#ff6b35', label: 'Origin' },
    { x: 200, y: 190, color: '#0077ff', label: 'Hub A' },
    { x: 310, y: 160, color: '#0077ff', label: 'Hub B' },
    { x: 420, y: 100, color: '#00ffaa', label: 'Destination' },
  ]

  return (
    <div className="map-container">
      <svg className="map-svg" viewBox="0 0 500 420" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,119,255,0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="markerGlow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#00ffaa" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        <ellipse cx="250" cy="210" rx="220" ry="180" fill="url(#mapGlow)" />

        {[60, 120, 180, 240, 300, 360].map(y => (
          <line key={y} x1="20" y1={y} x2="480" y2={y} stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
        ))}
        {[60, 120, 180, 240, 300, 360, 420].map(x => (
          <line key={x} x1={x} y1="20" x2={x} y2="400" stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
        ))}

        <path d="M 50 350 Q 180 300 250 220 Q 350 150 460 80" stroke="rgba(255,255,255,0.04)" strokeWidth="3" fill="none" strokeDasharray="8 4" />

        <polyline
          points={routePoints.map(p => `${p.x},${p.y}`).join(' ')}
          stroke="rgba(99,102,241,0.15)"
          strokeWidth="2"
          strokeDasharray="6 4"
          fill="none"
        />

        <path ref={trailRef} d="" stroke="url(#routeGrad)" strokeWidth="3" strokeLinecap="round" fill="none" filter="url(#glow)" />

        {cities.map((city, i) => (
          <g key={i}>
            <circle cx={city.x} cy={city.y} r="20" fill="rgba(99,102,241,0.05)" stroke="rgba(99,102,241,0.1)" strokeWidth="1" />
            <circle cx={city.x} cy={city.y} r="6" fill={city.color} stroke="rgba(6,6,15,0.8)" strokeWidth="2" filter="url(#glow)" />
            <text x={city.x} y={city.y + 24} textAnchor="middle" fill="rgba(240,240,255,0.4)" fontSize="9" fontFamily="Inter, sans-serif">
              {city.label}
            </text>
          </g>
        ))}

        <circle ref={markerRef} cx="80" cy="280" r="16" fill="rgba(99,102,241,0.08)" stroke="rgba(99,102,241,0.25)" strokeWidth="1">
          <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
        </circle>
        <circle ref={dotRef} cx="80" cy="280" r="8" fill="#6366f1" stroke="rgba(6,6,15,0.9)" strokeWidth="2.5" filter="url(#markerGlow)" />
      </svg>

      {/* Floating cards — with SVG icons, no emojis */}
      <div className="map-card map-card-1">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <LiveIcon /> Live Status
        </div>
        <div className="card-value live">In Transit</div>
        <div style={{ fontSize: '11px', color: 'rgba(240,240,255,0.4)', marginTop: '4px' }}>
          ORD-2847-KL · 2.3km away
        </div>
      </div>

      <div className="map-card map-card-2">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <TruckIcon /> ETA
        </div>
        <div className="card-value">14 min</div>
        <div style={{ fontSize: '11px', color: 'rgba(240,240,255,0.4)', marginTop: '4px' }}>
          On schedule ✓
        </div>
      </div>

      <div className="map-card map-card-3">
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <UsersIcon /> Active Fleet
        </div>
        <div className="card-value warning">382 agents</div>
        <div style={{ fontSize: '11px', color: 'rgba(240,240,255,0.4)', marginTop: '4px' }}>
          +12% from yesterday
        </div>
      </div>
    </div>
  )
}
