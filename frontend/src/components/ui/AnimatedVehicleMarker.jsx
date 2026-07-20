import { useEffect, useRef, useState } from 'react'
import { Marker } from 'react-map-gl/maplibre'
import RiderIcon from './RiderIcon'

function getBearing(start, end) {
  const toRad = (d) => (d * Math.PI) / 180
  const toDeg = (r) => (r * 180) / Math.PI
  const lat1 = toRad(start.lat), lat2 = toRad(end.lat)
  const dLng = toRad(end.lng - start.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

const lerp = (a, b, t) => a + (b - a) * t

// Truck ka pulse ring color alag (blue) rakha, bike/scooty ka red
const ringColor = { bike: '#e23744', scooty: '#e23744', scooter: '#e23744', truck: '#0077ff', van: '#0077ff' }

export default function AnimatedVehicleMarker({ position, vehicleType = 'bike', glideDuration = 4000 }) {
  const [display, setDisplay] = useState(position)
  const [bearing, setBearing] = useState(0)
  const animRef = useRef(null)
  const fromRef = useRef(position)
  const displayRef = useRef(position)

  useEffect(() => { displayRef.current = display }, [display])

  useEffect(() => {
    if (!position) return
    const from = fromRef.current || position
    if (from.lat !== position.lat || from.lng !== position.lng) {
      const newBearing = getBearing(from, position)
      if (!Number.isNaN(newBearing)) setBearing(newBearing)
      fromRef.current = position
    }
    const startPos = displayRef.current || position
    const startTime = performance.now()
    cancelAnimationFrame(animRef.current)
    const step = (now) => {
      const t = Math.min(1, (now - startTime) / glideDuration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = { lat: lerp(startPos.lat, position.lat, eased), lng: lerp(startPos.lng, position.lng, eased) }
      setDisplay(next)
      if (t < 1) animRef.current = requestAnimationFrame(step)
    }
    animRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animRef.current)
  }, [position?.lat, position?.lng, glideDuration])

  if (!display) return null
  const type = (vehicleType || 'bike').toLowerCase()
  const isTruck = type === 'truck' || type === 'van'
  const containerSize = isTruck ? 52 : 48
  const iconSize = isTruck ? 46 : 42
  const ringCol = ringColor[type] || '#e23744'

  return (
    <Marker longitude={display.lng} latitude={display.lat} anchor="center">
      <div style={{ position: 'relative', width: containerSize, height: containerSize, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Live signal ring */}
        <div
          style={{
            position: 'absolute',
            width: containerSize, height: containerSize,
            borderRadius: '50%',
            border: `2px solid ${ringCol}`,
            opacity: 0.3,
            animation: 'livePulse 2s infinite',
          }}
        />
        
        {/* Vehicle icon rotates towards direction of travel */}
        <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `rotate(${bearing}deg)`, transition: 'transform 0.4s linear' }}>
          <RiderIcon vehicleType={type} size={iconSize} />
        </div>
      </div>
    </Marker>
  )
}
