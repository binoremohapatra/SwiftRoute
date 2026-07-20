import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MapPin, Search, CreditCard, ChevronUp, Phone, Navigation, X, Clock, Package } from 'lucide-react'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import DashboardLayout from '../../components/DashboardLayout'
import AnimatedVehicleMarker from '../../components/ui/AnimatedVehicleMarker'
import DestinationPin from '../../components/ui/DestinationPin'
import ETABadge from '../../components/ui/ETABadge'
import OrderTimeline from '../../components/ui/OrderTimeline'
import StatusBadge from '../../components/ui/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { orderAPI, paymentAPI } from '../../services/api'
import { connectSocket, disconnectSocket, joinOrderRoom, leaveOrderRoom } from '../../services/socket'
import { useToast } from '../../components/ui/Toast'
import RatingModal from '../../components/RatingModal'

const mapStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

// Status accent colours
const STATUS_COLOR = {
  Placed: '#60a5fa',
  Assigned: '#8b5cf6',
  'Picked-up': '#f59e0b',
  'In-Transit': '#6366f1',
  Delivered: '#10b981',
  Cancelled: '#ef4444',
}

export default function TrackOrder() {
  const { token } = useAuth()
  const toast = useToast()
  const [params] = useSearchParams()

  const [orderId, setOrderId] = useState(params.get('id') || '')
  const [inputId, setInputId] = useState(params.get('id') || '')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [routeGeoJSON, setRouteGeoJSON] = useState(null)
  const [routeInfo, setRouteInfo] = useState(null)
  const [showRating, setShowRating] = useState(false)

  // Bottom-sheet state (mobile)
  const [sheetExpanded, setSheetExpanded] = useState(false)
  const sheetRef = useRef(null)
  const dragStartY = useRef(null)

  const fetchTracking = async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const trackRes = await orderAPI.track(id, token)
      if (trackRes.success) {
        setData(trackRes.data)
        if (trackRes.data.status === 'Delivered' && !trackRes.data.rating) {
          setShowRating(true)
        }
        if (trackRes.data.pickup && trackRes.data.drop) {
          fetchRoute(trackRes.data.pickup, trackRes.data.drop)
        }
      } else {
        toast.error('Tracking Failed', trackRes.message)
      }
    } catch {
      toast.error('Connection Error', "Couldn't reach the server — check your connection and try again")
    } finally {
      setLoading(false)
    }
  }

  const fetchRoute = async (pickup, drop) => {
    try {
      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`)
      if (!res.ok) throw new Error('OSRM API Error')
      const json = await res.json()
      if (json.routes && json.routes.length > 0) {
        const route = json.routes[0]
        if (route.geometry && route.geometry.coordinates) {
          route.geometry.coordinates.unshift([pickup.lng, pickup.lat])
          route.geometry.coordinates.push([drop.lng, drop.lat])
        }
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.ceil(route.duration / 60)
        })
        setRouteGeoJSON({ type: 'Feature', geometry: route.geometry })
      } else {
        throw new Error('No route found')
      }
    } catch (e) {
      console.warn('OSRM routing failed', e)
      setRouteGeoJSON({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[pickup.lng, pickup.lat], [drop.lng, drop.lat]] } })
    }
  }

  useEffect(() => {
    if (orderId) fetchTracking(orderId)
  }, [orderId])

  useEffect(() => {
    if (!orderId || !token) return
    const socket = connectSocket(token)
    
    const joinRoom = () => joinOrderRoom(orderId)
    socket.on('connect', joinRoom)
    
    if (socket.connected) {
      joinRoom()
    } else {
      joinRoom() // buffered
    }

    const handleLocationUpdate = (update) => {
      setData(prev => {
        if (!prev) return prev
        return { ...prev, agentLocation: { lat: update.lat, lng: update.lng, updatedAt: update.timestamp } }
      })
    }

    const handleStatusChanged = ({ status }) => {
      setData(prev => {
        if (!prev) return prev
        if (status === 'Delivered' && !prev.rating) setShowRating(true)
        return { ...prev, status }
      })
      fetchTracking(orderId)
      toast.info('Status Updated', `Order is now ${status}`)
    }

    socket.on('agent:locationUpdate', handleLocationUpdate)
    socket.on('order:statusChanged', handleStatusChanged)

    return () => {
      socket.off('connect', joinRoom)
      socket.off('agent:locationUpdate', handleLocationUpdate)
      socket.off('order:statusChanged', handleStatusChanged)
      leaveOrderRoom(orderId)
    }
  }, [orderId, token, toast])

  const initialViewState = useMemo(() => {
    if (data?.pickup) return { longitude: data.pickup.lng, latitude: data.pickup.lat, zoom: 12 }
    return { longitude: 77.2090, latitude: 28.6139, zoom: 10 }
  }, [data?.pickup])

  const handleRateSubmit = async (orderId, rating, review) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/orders/${orderId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, review })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success('Rating submitted — thank you!')
        setData(prev => ({ ...prev, rating }))
        setShowRating(false)
      } else {
        toast.error(json.message || 'Failed to submit rating')
      }
    } catch {
      toast.error('Network error')
    } finally {
      setShowRating(false)
    }
  }

  const handleRetryPayment = async () => {
    try {
      setLoading(true)
      const paymentAmount = Math.max(data.amount || 0, 1)
      const rpRes = await paymentAPI.createOrder({ amount: paymentAmount }, token)
      if (!rpRes.success) throw new Error('Failed to init payment')
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TFfm2nIhhR1QeB',
        amount: rpRes.data.amount,
        currency: 'INR',
        name: 'SwiftRoute',
        description: `Payment for Order ${data.orderNumber}`,
        order_id: rpRes.data.id,
        handler: async function (response) {
          try {
            const verifyRes = await paymentAPI.verifyPayment({
              internal_order_id: orderId,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            }, token)
            if (verifyRes.success) { toast.success('Payment Successful!'); fetchTracking(orderId) }
            else toast.error('Payment Verification Failed')
          } catch { toast.error('Payment Verification Error') }
        },
        theme: { color: '#6366f1' }
      }
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => toast.error('Payment Failed', response.error.description))
      rzp.open()
    } catch { toast.error('Payment Gateway Error') }
    finally { setLoading(false) }
  }

  const { activeRouteGeoJSON, activeETA } = useMemo(() => {
    let remainingMins = routeInfo?.duration ?? '--'
    if (!routeGeoJSON?.geometry?.coordinates) return { activeRouteGeoJSON: routeGeoJSON, activeETA: remainingMins }
    const coords = routeGeoJSON.geometry.coordinates
    const agentLoc = data?.agentLocation
    if (!agentLoc?.lat || !agentLoc?.lng || data?.status !== 'In-Transit') return { activeRouteGeoJSON: routeGeoJSON, activeETA: remainingMins }
    let minDistance = Infinity, closestIndex = 0
    for (let i = 0; i < coords.length; i++) {
      const dist = Math.pow(coords[i][0] - agentLoc.lng, 2) + Math.pow(coords[i][1] - agentLoc.lat, 2)
      if (dist < minDistance) { minDistance = dist; closestIndex = i }
    }
    const remainingCoords = coords.slice(closestIndex)
    remainingCoords.unshift([agentLoc.lng, agentLoc.lat])
    if (routeInfo?.duration && coords.length > 0) {
      remainingMins = Math.max(1, Math.ceil((remainingCoords.length / coords.length) * routeInfo.duration))
    }
    return {
      activeRouteGeoJSON: { type: 'Feature', geometry: { type: 'LineString', coordinates: remainingCoords } },
      activeETA: remainingMins
    }
  }, [routeGeoJSON, data?.agentLocation?.lat, data?.agentLocation?.lng, data?.status, routeInfo])

  const accentColor = data ? (STATUS_COLOR[data.status] || '#6366f1') : '#6366f1'

  // Touch drag handlers for bottom sheet
  const handleDragStart = (e) => {
    dragStartY.current = e.touches ? e.touches[0].clientY : e.clientY
  }
  const handleDragEnd = (e) => {
    if (dragStartY.current === null) return
    const endY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY
    const delta = dragStartY.current - endY
    if (delta > 40) setSheetExpanded(true)
    if (delta < -40) setSheetExpanded(false)
    dragStartY.current = null
  }

  return (
    <DashboardLayout>
      {/* Full-bleed track page — overrides dash-page padding */}
      <div className="track-page-root">

        {/* ═══ FLOATING SEARCH BAR ═══ */}
        <div className="track-search-float">
          <form
            style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}
            onSubmit={(e) => { e.preventDefault(); setOrderId(inputId) }}
          >
            <Search size={15} style={{ color: 'rgba(240,240,255,0.4)', flexShrink: 0 }} />
            <input
              className="track-search-input"
              placeholder="Enter Order ID…"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              required
            />
            <button className="btn-primary" type="submit" style={{ padding: '0.5rem 1.1rem', borderRadius: 10, fontSize: '0.825rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Track
            </button>
          </form>
        </div>

        {/* ═══ MAP LAYER ═══ */}
        <div className="track-map-container">
          {loading ? (
            /* Animated route-loading state — not a spinner */
            <div className="track-map-loading">
              <div className="track-route-anim">
                <svg width="200" height="80" viewBox="0 0 200 80" fill="none">
                  <path
                    d="M10 70 Q 60 10 100 40 Q 140 70 190 10"
                    stroke="rgba(99,102,241,0.2)"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    fill="none"
                  />
                  <path
                    className="track-route-draw"
                    d="M10 70 Q 60 10 100 40 Q 140 70 190 10"
                    stroke="#6366f1"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray="240"
                    strokeDashoffset="240"
                  />
                  <circle cx="10" cy="70" r="5" fill="#8b5cf6" />
                  <circle cx="190" cy="10" r="5" fill="#10b981" />
                </svg>
              </div>
              <p style={{ color: 'rgba(240,240,255,0.45)', fontSize: '0.875rem', marginTop: '1rem', fontWeight: 500 }}>
                Finding your delivery partner…
              </p>
            </div>
          ) : !data ? (
            /* Empty / no-order state */
            <div className="track-map-loading">
              <svg width="160" height="120" viewBox="0 0 160 120" fill="none" style={{ marginBottom: '1rem' }}>
                {/* Package body */}
                <rect x="45" y="45" width="70" height="55" rx="6" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="2"/>
                <line x1="80" y1="45" x2="80" y2="100" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
                <line x1="55" y1="62" x2="105" y2="62" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5"/>
                {/* Box flap */}
                <path d="M45 45 L60 32 L100 32 L115 45" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="2"/>
                {/* Route dotted line */}
                 <path d="M10 108 Q 30 60 80 100 Q 130 140 150 12" stroke="rgba(99,102,241,0.2)" strokeWidth="2" strokeDasharray="5 4" fill="none" strokeLinecap="round"/>
                {/* Question mark */}
                <text x="73" y="78" fontSize="22" fontWeight="700" fill="rgba(240,240,255,0.15)" fontFamily="monospace">?</text>
              </svg>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'rgba(240,240,255,0.4)', marginBottom: '0.4rem' }}>
                No order loaded yet
              </div>
              <div style={{ fontSize: '0.82rem', color: 'rgba(240,240,255,0.25)', textAlign: 'center', maxWidth: 220 }}>
                Enter an Order ID above to see your live delivery on the map
              </div>
            </div>
          ) : (
            <Map
              initialViewState={initialViewState}
              mapStyle={mapStyle}
              style={{ width: '100%', height: '100%' }}
              mapLib={maplibregl}
            >
              {data.pickup && (
                <Marker longitude={data.pickup.lng} latitude={data.pickup.lat} anchor="bottom">
                  <div style={{ background: '#8b5cf6', color: '#fff', padding: '4px 10px', borderRadius: 8, fontWeight: 700, fontSize: 12, border: '2px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>Pickup</div>
                </Marker>
              )}
              {data.drop && (
                <Marker longitude={data.drop.lng} latitude={data.drop.lat} anchor="bottom">
                  <DestinationPin />
                </Marker>
              )}
              {(data.agentLocation?.lat ? data.agentLocation : (data.pickup?.lat ? data.pickup : null)) && (
                <>
                  <AnimatedVehicleMarker
                    position={{ lat: data.agentLocation?.lat || data.pickup?.lat, lng: data.agentLocation?.lng || data.pickup?.lng }}
                    vehicleType={data.agent?.vehicleType}
                    glideDuration={3000}
                  />
                  <Marker longitude={data.agentLocation?.lng || data.pickup?.lng} latitude={data.agentLocation?.lat || data.pickup?.lat} anchor="left" offset={[28, -10]}>
                    <ETABadge minutes={activeETA} />
                  </Marker>
                </>
              )}
              {activeRouteGeoJSON && (
                <Source id="route" type="geojson" data={activeRouteGeoJSON}>
                  <Layer
                    id="route-layer"
                    type="line"
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{ 'line-color': '#6366f1', 'line-width': 5, 'line-opacity': 0.8 }}
                  />
                </Source>
              )}
            </Map>
          )}
        </div>

        {/* ═══ FLOATING SIDE PANEL (desktop) / BOTTOM SHEET (mobile) ═══ */}
        {data && !loading && (
          <div
            className={`track-panel${sheetExpanded ? ' expanded' : ''}`}
            ref={sheetRef}
          >
            {/* Drag handle (mobile only) */}
            <div
              className="track-sheet-handle"
              onTouchStart={handleDragStart}
              onTouchEnd={handleDragEnd}
              onClick={() => setSheetExpanded(e => !e)}
            >
              <div className="track-sheet-grip" />
            </div>

            <div className="track-panel-scroll">
              {/* Order identity block */}
              <div className="track-order-id-block" style={{ borderLeftColor: accentColor }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span className="track-order-num">{data.orderNumber}</span>
                  <StatusBadge status={data.status} size="lg" />
                </div>
                {routeInfo && data.fulfillmentType !== '3PL' && (
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Navigation size={11} /> {routeInfo.distance} km
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={11} /> ~{routeInfo.duration} min
                    </span>
                  </div>
                )}
              </div>

              {/* Route summary — pickup → drop */}
              <div className="track-route-summary">
                <div className="track-route-point pickup">
                  <div className="track-route-dot" style={{ background: '#8b5cf6' }} />
                  <div>
                    <div className="track-route-label">Pickup</div>
                    <div className="track-route-addr">{data.pickup?.address || 'N/A'}</div>
                  </div>
                </div>
                <div className="track-route-line" />
                <div className="track-route-point drop">
                  <div className="track-route-dot" style={{ background: '#10b981' }} />
                  <div>
                    <div className="track-route-label">Drop-off</div>
                    <div className="track-route-addr">{data.drop?.address || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Delivery progress */}
              <div className="track-panel-section">
                <div className="track-section-title">Delivery Progress</div>
                <OrderTimeline status={data.status} timestamps={{ Placed: data.createdAt, 'Delivered': data.updatedAt }} />
              </div>

              {/* 3PL info */}
              {data.fulfillmentType === '3PL' && (
                <div className="track-panel-section">
                  <div style={{ padding: '0.875rem', background: 'rgba(245,158,11,0.07)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
                    <PanelRow label="Fulfillment" value="Third-Party Logistics" />
                    <PanelRow label="Courier" value={data.thirdPartyCourier || 'N/A'} />
                    <PanelRow label="Tracking ID" value={data.thirdPartyTrackingId || 'N/A'} accent />
                  </div>
                </div>
              )}

              {/* Payment row */}
              <div className="track-panel-section">
                <div className="track-section-title">Payment</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>₹{data.amount}</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                    background: data.paymentStatus === 'PAID' ? 'rgba(52,211,153,0.1)' : data.paymentMethod === 'COD' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
                    color: data.paymentStatus === 'PAID' ? '#10b981' : data.paymentMethod === 'COD' ? '#fbbf24' : '#ef4444'
                  }}>
                    {data.paymentStatus === 'PAID' ? 'PAID' : data.paymentMethod === 'COD' ? 'COD PENDING' : 'FAILED'}
                  </span>
                </div>
              </div>

              {/* Agent card */}
              {data.agent && (
                <div className="track-panel-section">
                  <div className="track-section-title">Your Delivery Partner</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <div style={{ width: 46, height: 46, background: 'var(--color-surface)', flexShrink: 0 }}>
                      {data.agent.name?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{data.agent.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'rgba(240,240,255,0.4)', marginTop: 2 }}>{data.agent.vehicleType}</div>
                    </div>
                    <a
                      href={`tel:${data.agent.phone}`}
                      style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      title="Call agent"
                    >
                      <Phone size={16} color="#10b981" />
                    </a>
                  </div>
                </div>
              )}

              {/* Retry payment CTA */}
              {data.paymentStatus !== 'PAID' && data.paymentMethod !== 'COD' && (
                <div className="track-panel-section">
                  <button onClick={handleRetryPayment} className="btn-primary btn-glow" style={{ width: '100%', padding: '0.9rem', borderRadius: 14, fontSize: '0.9rem', fontWeight: 700, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
                    <CreditCard size={16} /> Pay ₹{data.amount} Now
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <RatingModal
        isOpen={showRating}
        onClose={() => setShowRating(false)}
        orderId={data?.orderId}
        onSubmit={handleRateSubmit}
      />
    </DashboardLayout>
  )
}

function PanelRow({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.5rem' }}>
      <span style={{ fontSize: '0.78rem', color: 'rgba(240,240,255,0.4)', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: '0.82rem', fontWeight: accent ? 700 : 500, color: accent ? '#6366f1' : 'var(--text-primary)', textAlign: 'right' }}>{value}</span>
    </div>
  )
}
