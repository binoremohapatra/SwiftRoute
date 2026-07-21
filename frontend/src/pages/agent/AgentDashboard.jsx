import { useState, useEffect, useRef, useMemo } from 'react'
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import AnimatedVehicleMarker from '../../components/ui/AnimatedVehicleMarker'
import { Package, Clock, TrendingUp, Star, MapPin, Navigation, Phone, ChevronDown, ChevronUp, Download, Zap, Banknote } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { agentAPI, orderAPI, paymentAPI } from '../../services/api'
import { connectSocket, emitAgentStatus, emitLocationUpdate } from '../../services/socket'

const mapStyle = {
  version: 8,
  sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256 } },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }],
}

const nextStatus = { 'Assigned': 'Picked-up', 'Picked-up': 'In-Transit', 'In-Transit': 'Delivered' }
const actionLabel = { 'Picked-up': 'Confirm Pickup ✅', 'In-Transit': 'Start Transit 🚗', 'Delivered': 'Mark Delivered 🎉' }
const actionColor = { 'Picked-up': '', 'In-Transit': 'linear-gradient(135deg,#8b5cf6,#8b5cf6)', 'Delivered': 'linear-gradient(135deg,#10b981,#10b981)' }

function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0
  const R = 6371e3
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lon2-lon1) * Math.PI/180
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
export default function AgentDashboard() {
  const { token, user } = useAuth()
  const toast = useToast()
  const mapRef = useRef(null)

  const [orders, setOrders] = useState([])
  const [performance, setPerformance] = useState(null)
  const [available, setAvailable] = useState(true)
  const [loading, setLoading] = useState(true)
  const [agentLocation, setAgentLocation] = useState(null)
  const [toggling, setToggling] = useState(false)
  const [liveOrder, setLiveOrder] = useState(null)
  const [routeGeoJSON, setRouteGeoJSON] = useState(null)
  const [expandedOrders, setExpandedOrders] = useState({})
  const [updating, setUpdating] = useState(null)
  const [newRequest, setNewRequest] = useState(null)
  const [newRequestTimer, setNewRequestTimer] = useState(0)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const simProgressRef = useRef(0)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    simProgressRef.current = 0
  }, [liveOrder?.id, liveOrder?.status])

  useEffect(() => {
    if (newRequest && newRequestTimer > 0) {
      const t = setTimeout(() => setNewRequestTimer(v => v - 1), 1000)
      return () => clearTimeout(t)
    } else if (newRequest && newRequestTimer === 0) {
      handleRejectRequest(newRequest.orderId)
    }
  }, [newRequest, newRequestTimer])

  useEffect(() => {
    Promise.all([
      agentAPI.getDeliveries(token, { limit: 50, sortOrder: 'desc' }),
      agentAPI.getPerformance(token),
      agentAPI.getProfile(token),
    ]).then(([oRes, pRes, profRes]) => {
      if (oRes.success) setOrders(oRes.data.data || [])
      if (pRes.success) setPerformance(pRes.data)
      if (profRes.success) setAvailable(profRes.data.isAvailable)
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load dashboard data')
      setLoading(false)
    })

    const socket = connectSocket(token)
    
    socket.on('order:dispatchRequest', (data) => {
      setNewRequest(data)
      setNewRequestTimer(30)
    })

    const locationInterval = setInterval(() => {
      // Simulation Logic for In-Transit
      if (liveOrder?.status === 'In-Transit' && routeGeoJSON) {
        const coords = routeGeoJSON.geometry.coordinates
        if (coords && coords.length > 0) {
          const point = coords[Math.min(simProgressRef.current, coords.length - 1)]
          const loc = { lat: point[1], lng: point[0], orderId: liveOrder.id }
          emitLocationUpdate(loc)
          setAgentLocation(loc)
          
          // Advance simulation dynamically so it finishes in a reasonable time (~2-3 mins)
          if (simProgressRef.current < coords.length - 1) {
            const stepSize = Math.max(1, Math.floor(coords.length / 60))
            simProgressRef.current = Math.min(coords.length - 1, simProgressRef.current + stepSize)
          }
        }
      } else {
        // Fallback to real GPS
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude, orderId: liveOrder?.id }
              emitLocationUpdate(loc)
              setAgentLocation(loc)
            },
            () => {},
            { enableHighAccuracy: true }
          )
        }
      }
    }, 3000)
    return () => {
      clearInterval(locationInterval)
      socket.off('order:dispatchRequest')
    }
  }, [token, liveOrder, routeGeoJSON, toast])

  // Fetch route when liveOrder changes
  useEffect(() => {
    if (!liveOrder?.pickupLat) return
    const fetchRoute = async () => {
      try {
        const { pickupLng, pickupLat, dropLng, dropLat } = liveOrder
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${pickupLng},${pickupLat};${dropLng},${dropLat}?overview=full&geometries=geojson`)
        const json = await res.json()
        if (json.routes?.length > 0) {
          const coords = json.routes[0].geometry.coordinates
          coords.unshift([pickupLng, pickupLat])
          coords.push([dropLng, dropLat])
          setRouteGeoJSON({ type: 'Feature', geometry: { type: 'LineString', coordinates: coords } })
        }
      } catch {
        if (liveOrder.pickupLat) {
          setRouteGeoJSON({ type: 'Feature', geometry: { type: 'LineString', coordinates: [[liveOrder.pickupLng, liveOrder.pickupLat], [liveOrder.dropLng, liveOrder.dropLat]] } })
        }
      }
    }
    fetchRoute()
    // Center map on active order
    if (mapRef.current && liveOrder.pickupLat && liveOrder.dropLat) {
      const midLat = (liveOrder.pickupLat + liveOrder.dropLat) / 2
      const midLng = (liveOrder.pickupLng + liveOrder.dropLng) / 2
      setTimeout(() => mapRef.current?.flyTo({ center: [midLng, midLat], zoom: 13, duration: 1000 }), 500)
    }
  }, [liveOrder?.id])

  const active = orders.filter(o => ['Assigned', 'Picked-up', 'In-Transit'].includes(o.status))

  useEffect(() => {
    if (active.length > 0 && !liveOrder) setLiveOrder(active[0])
  }, [orders])

  const toggleAvailability = async () => {
    setToggling(true)
    const newStatus = available ? 'Offline' : 'Online'
    try {
      const res = await agentAPI.updateStatus(newStatus, token)
      if (res.success) {
        setAvailable(res.data.isAvailable)
        emitAgentStatus(newStatus)
        toast.info('Status Updated', `You are now ${res.data.isAvailable ? 'Online' : 'Offline'}`)
      }
    } catch { toast.error('Failed to update status') }
    setToggling(false)
  }

  const handleAcceptRequest = async (orderId) => {
    try {
      const res = await orderAPI.accept(orderId, token)
      if (res.success) {
        toast.success('Order Accepted!', 'Navigating to pickup...')
        setOrders(prev => [res.data, ...prev])
        setLiveOrder(res.data)
        setAvailable(false) // Agent is now busy
        setNewRequest(null)
      }
    } catch {
      toast.error('Failed to accept order')
    }
  }

  const handleRejectRequest = async (orderId) => {
    try {
      await orderAPI.reject(orderId, token)
      setNewRequest(null)
    } catch {
      toast.error('Failed to reject order')
      setNewRequest(null)
    }
  }

  const handleStatusUpdate = async (order, status) => {
    if (status === 'Picked-up' || status === 'Delivered') {
      if (!navigator.geolocation) {
        toast.error('Error', 'Geolocation is not supported by your browser')
        return
      }
      setUpdating(order.id)
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          const targetLat = status === 'Picked-up' ? order.pickupLat : order.dropLat
          const targetLng = status === 'Picked-up' ? order.pickupLng : order.dropLng
          let distance  = getDistance(latitude, longitude, targetLat, targetLng)
          const maxDistance = 1000; // 1km limit for both pickup and delivery

          // Demo Fallback: If real laptop GPS fails, use the simulated bike location on the map
          if (distance > maxDistance && agentLocation) {
            const simDistance = getDistance(agentLocation.lat, agentLocation.lng, targetLat, targetLng)
            if (simDistance <= maxDistance) distance = simDistance;
          }

          if (distance > maxDistance) {
            toast.error('Location Error', `You are ${Math.round(distance)}m away. You must be within ${maxDistance}m to mark as ${status}!`)
            setUpdating(null)
            return
          }
          await executeStatusUpdate(order, status)
        },
        () => {
          toast.error('Location Required', 'Allow location access to update status')
          setUpdating(null)
        },
        { enableHighAccuracy: true }
      )
    } else {
      await executeStatusUpdate(order, status)
    }
  }

  const executeStatusUpdate = async (order, status) => {
    setUpdating(order.id)
    try {
      const res = await orderAPI.updateStatus(order.id, { status }, token)
      if (res.success) {
        const updated = orders.map(o => o.id === order.id ? { ...o, status } : o)
        setOrders(updated)
        if (liveOrder?.id === order.id) {
          setLiveOrder({ ...liveOrder, status })
        }
        toast.success('Order Updated', `Order is now ${status}`)
        if (['Delivered', 'Cancelled'].includes(status)) {
          setLiveOrder(null)
          setRouteGeoJSON(null)
          agentAPI.getPerformance(token).then(r => r.success && setPerformance(r.data))
        }
      }
    } catch { toast.error('Failed to update order status') }
    setUpdating(null)
  }

  const handleCollectCashAndDeliver = async (order) => {
    setUpdating(order.id)
    try {
      const pRes = await paymentAPI.collectCash({ orderId: order.id }, token)
      if (pRes.success) {
        toast.success('Cash Collected', `₹${order.amount} collected from customer.`)
        await handleStatusUpdate(order, 'Delivered')
      }
    } catch {
      toast.error('Failed to register cash collection')
      setUpdating(null)
    }
  }

  const handleOptimizeRoute = async () => {
    try {
      toast.info('Optimizing...', 'Calculating best route...')
      const res = await agentAPI.getOptimizedRoute(token)
      if (res.success && res.data) {
        toast.success('Route Optimized! ✨', 'Follow the new sequence for maximum efficiency.')
        // In a full implementation, we'd reorder the `orders` list based on the returned stops.
        // For now, let's just log it or apply simple sorting if needed.
        const orderSequence = [...new Set(res.data.map(stop => stop.orderId))]
        setOrders(prev => {
          const newOrders = [...prev]
          newOrders.sort((a, b) => {
            const indexA = orderSequence.indexOf(a.id)
            const indexB = orderSequence.indexOf(b.id)
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
          })
          return newOrders
        })
      }
    } catch {
      toast.error('Optimization Failed', 'Could not optimize route')
    }
  }

  // Navigation target depends on current status
  const getNavTarget = (order) => {
    if (order.status === 'Assigned' || order.status === 'Picked-up') {
      return { lat: order.pickupLat, lng: order.pickupLng, label: 'Pickup' }
    }
    return { lat: order.dropLat, lng: order.dropLng, label: 'Drop' }
  }

  const initialViewState = liveOrder?.pickupLat
    ? { longitude: (liveOrder.pickupLng + liveOrder.dropLng) / 2, latitude: (liveOrder.pickupLat + liveOrder.dropLat) / 2, zoom: 12 }
    : { longitude: 77.2090, latitude: 28.6139, zoom: 11 }

  const activeRouteGeoJSON = useMemo(() => {
    if (!routeGeoJSON || !routeGeoJSON.geometry || !routeGeoJSON.geometry.coordinates) return routeGeoJSON;
    const coords = routeGeoJSON.geometry.coordinates;
    const agentLoc = agentLocation;

    if (!agentLoc || !agentLoc.lat || !agentLoc.lng || liveOrder?.status !== 'In-Transit') {
      return routeGeoJSON; 
    }

    let minDistance = Infinity;
    let closestIndex = 0;
    for (let i = 0; i < coords.length; i++) {
      const dist = Math.pow(coords[i][0] - agentLoc.lng, 2) + Math.pow(coords[i][1] - agentLoc.lat, 2);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }
    const remainingCoords = coords.slice(closestIndex);
    remainingCoords.unshift([agentLoc.lng, agentLoc.lat]);
    return { type: 'Feature', geometry: { type: 'LineString', coordinates: remainingCoords } };
  }, [routeGeoJSON, agentLocation?.lat, agentLocation?.lng, liveOrder?.status]);

  return (
    <DashboardLayout>
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">Agent Dashboard</h2>
            <p className="dash-page-sub">Welcome back, {user?.name?.split(' ')[0]}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="btn-primary"
                style={{ padding: '0.6rem 1rem', borderRadius: 999, background: 'var(--color-surface)', gap: 6 }}
              >
                <Download size={14} /> Install App
              </button>
            )}
            <button
              onClick={toggleAvailability}
              disabled={toggling}
              className="avail-toggle"
              style={{
                borderColor: available ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.1)',
                background: available ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.04)',
                color: available ? '#10b981' : 'rgba(240,240,255,0.45)'
              }}
            >
              {available ? 'Available for Orders' : 'Currently Offline'}
              <div style={{ width: 44, height: 26, borderRadius: 999, position: 'relative', transition: 'background 0.3s', background: available ? '#10b981' : 'rgba(255,255,255,0.12)', boxShadow: available ? '0 0 12px rgba(52,211,153,0.4)' : 'none', flexShrink: 0, marginLeft: 8 }}>
                <div style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', transform: available ? 'translateX(18px)' : 'translateX(0)' }} />
              </div>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="dash-stats-grid stagger-list">
          <StatCard label="Total Deliveries" value={performance?.totalDeliveries ?? 0} icon={Package} loading={loading} />
          <StatCard label="Active Orders"    value={active.length} icon={Clock} color="var(--accent-indigo)" loading={loading} />
          <StatCard label="Success Rate"     value={performance?.successRate ?? 0} suffix="%" icon={TrendingUp} loading={loading} />
          <StatCard label="Avg Time (mins)"  value={performance?.avgDeliveryTimeMinutes ?? 0} icon={Star} loading={loading} />
        </div>

        {active.length > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button 
              onClick={handleOptimizeRoute}
              className="btn-primary btn-glow"
              style={{ background: 'var(--color-surface)' }}
            >
              <Zap size={14} /> Optimize My Route
            </button>
          </div>
        )}

        {active.length === 0 && !loading ? (
          <div style={{ marginTop: '1.5rem' }}>
            <EmptyState icon="agent" title="No active deliveries" subtitle={available ? 'Waiting for new orders to be assigned to you.' : 'Go online to receive new orders.'} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
            {active.map((order, idx) => {
              const isExpanded = expandedOrders[order.id] !== false // default expanded for first
              const navTarget = getNavTarget(order)
              const isLive = liveOrder?.id === order.id
              const ns = nextStatus[order.status]

              return (
                <div
                  key={order.id}
                  className="glass-card"
                  style={{
                    borderRadius: 20,
                    overflow: 'hidden',
                    borderTop: `3px solid ${order.status === 'In-Transit' ? '#6366f1' : order.status === 'Picked-up' ? '#8b5cf6' : '#f59e0b'}`,
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{ padding: '1rem 1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isLive ? 'rgba(99,102,241,0.04)' : 'transparent' }}
                    onClick={() => {
                      setLiveOrder(order)
                      setExpandedOrders(prev => ({ ...prev, [order.id]: !isExpanded }))
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
                      {isLive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', boxShadow: '0 0 8px #6366f1', animation: 'livePulse 2s infinite' }} />}
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{order.orderNumber}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${navTarget.lat},${navTarget.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1', padding: '0.35rem 0.75rem', borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}
                      >
                        <Navigation size={12} /> Navigate to {navTarget.label}
                      </a>
                      {isExpanded ? <ChevronUp size={16} color="rgba(240,240,255,0.4)" /> : <ChevronDown size={16} color="rgba(240,240,255,0.4)" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="agent-order-grid">
                      
                      {/* Left Side: Order Details & Actions */}
                      <div className="agent-order-col">
                        {/* Address Details */}
                        <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <MapPin size={12} /> Pickup Address
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 500 }}>{order.pickupAddress}</div>
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.pickupLat},${order.pickupLng}`} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', fontSize: '0.75rem', color: '#8b5cf6', textDecoration: 'none', fontWeight: 600 }}>
                              <Navigation size={12} /> Open in Maps
                            </a>
                          </div>
                          
                          <div style={{ height: 1, background: 'rgba(255,255,255,0.04)' }} />

                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <MapPin size={12} /> Drop Address
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 500 }}>{order.dropAddress}</div>
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.dropLat},${order.dropLng}`} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: '0.5rem', fontSize: '0.75rem', color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>
                              <Navigation size={12} /> Open in Maps
                            </a>
                          </div>
                        </div>

                        {/* Customer + Action (Sticks to bottom of left col) */}
                        <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-surface)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                              {order.customer?.name?.[0]?.toUpperCase() || 'C'}
                            </div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{order.customer?.name}</div>
                              <a href={`tel:${order.customer?.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-secondary)', textDecoration: 'none', marginTop: 2, fontWeight: 500 }}>
                                <Phone size={10} /> {order.customer?.phone}
                              </a>
                            </div>
                          </div>

                          {ns && (
                            ns === 'Delivered' && order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID' ? (
                              <button
                                onClick={() => handleCollectCashAndDeliver(order)}
                                disabled={updating === order.id}
                                className="btn-primary"
                                style={{ padding: '0.75rem 1.25rem', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700, background: 'var(--color-surface)' }}
                              >
                                {updating === order.id ? '⏳ Updating...' : <><Banknote size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: 6}}/> Collect ₹{order.amount} & Deliver</>}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusUpdate(order, ns)}
                                disabled={updating === order.id}
                                className="btn-primary"
                                style={{ padding: '0.75rem 1.5rem', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700, background: actionColor[ns] || '', opacity: updating === order.id ? 0.7 : 1, color: ns === 'Delivered' ? '#0a0a12' : '#fff' }}
                              >
                                {updating === order.id ? '⏳ Updating...' : actionLabel[ns]}
                              </button>
                            )
                          )}
                        </div>
                      </div>

                      {/* Right Side: Map */}
                      <div className="agent-order-map-col">
                        {order.pickupLat ? (
                          <Map
                            ref={isLive ? mapRef : undefined}
                            initialViewState={{
                              longitude: (order.pickupLng + order.dropLng) / 2,
                              latitude: (order.pickupLat + order.dropLat) / 2,
                              zoom: 12,
                            }}
                            mapStyle={mapStyle}
                            style={{ width: '100%', height: '100%' }}
                            mapLib={maplibregl}
                            scrollZoom={false}
                          >
                            <NavigationControl position="bottom-right" />

                            {/* Route line */}
                            {isLive && activeRouteGeoJSON && (
                              <Source id="agent-route" type="geojson" data={activeRouteGeoJSON}>
                                <Layer id="route-shadow" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }} paint={{ 'line-color': '#000', 'line-width': 7, 'line-opacity': 0.2 }} />
                                <Layer id="route-line" type="line" layout={{ 'line-join': 'round', 'line-cap': 'round' }} paint={{ 'line-color': '#6366f1', 'line-width': 4 }} />
                              </Source>
                            )}

                            {/* Live Agent Marker */}
                            {isLive && agentLocation && order.status === 'In-Transit' && (
                              <AnimatedVehicleMarker
                                position={{ lat: agentLocation.lat, lng: agentLocation.lng }}
                                vehicleType={user?.vehicleType || 'bike'}
                                glideDuration={3000}
                              />
                            )}

                            {/* Pickup pin */}
                            <Marker longitude={order.pickupLng} latitude={order.pickupLat} anchor="bottom">
                              <div style={{ background: '#8b5cf6', color: '#fff', padding: '5px 10px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, boxShadow: '0 4px 16px rgba(167,139,250,0.6)', border: '1.5px solid white', whiteSpace: 'nowrap' }}>
                                📦 Pickup
                              </div>
                            </Marker>

                            {/* Drop pin */}
                            <Marker longitude={order.dropLng} latitude={order.dropLat} anchor="bottom">
                              <div style={{ background: '#10b981', color: '#0a0a12', padding: '5px 10px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700, boxShadow: '0 4px 16px rgba(52,211,153,0.6)', border: '1.5px solid white', whiteSpace: 'nowrap' }}>
                                🏠 Drop
                              </div>
                            </Marker>
                          </Map>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>Location not available</div>
                        )}

                        {/* Map hint */}
                        <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(10,10,18,0.75)', backdropFilter: 'blur(6px)', borderRadius: 8, padding: '6px 12px', fontSize: '0.7rem', color: 'rgba(240,240,255,0.7)', pointerEvents: 'none' }}>
                          Click map to unlock scroll zoom
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* New Order Request Modal */}
      {newRequest && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
          <div style={{ background: '#12121a', border: '1px solid rgba(99,102,241,0.2)', padding: '2rem', borderRadius: 24, width: '90%', maxWidth: 400, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: 4, background: '#6366f1', transition: 'width 1s linear', width: `${(newRequestTimer / 30) * 100}%` }} />
            
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Package size={32} color="#6366f1" />
            </div>
            
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>New Delivery Request!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Pickup is <strong style={{ color: '#6366f1' }}>{newRequest.etaMins} mins</strong> away ({newRequest.distance} km).
            </p>
            
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: 12, marginBottom: '2rem', textAlign: 'left' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#8b5cf6', textTransform: 'uppercase', fontWeight: 700 }}>Pickup</span>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{newRequest.pickupAddress}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 700 }}>Drop</span>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{newRequest.dropAddress}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                onClick={() => handleRejectRequest(newRequest.orderId)}
                style={{ padding: '0.875rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer' }}>
                Reject
              </button>
              <button 
                onClick={() => handleAcceptRequest(newRequest.orderId)}
                style={{ padding: '0.875rem', borderRadius: 12, border: 'none', background: 'var(--color-surface)' }}>
                Accept ({newRequestTimer}s)
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
