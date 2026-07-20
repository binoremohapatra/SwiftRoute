import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ArrowLeft, Navigation, Activity, MapPin, Package, Clock, User, ChevronRight, RefreshCw, Search, X } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import AnimatedVehicleMarker from '../../components/ui/AnimatedVehicleMarker'
import { useAuth } from '../../context/AuthContext'
import { adminAPI } from '../../services/api'
import { connectSocket } from '../../services/socket'
import StatusBadge from '../../components/ui/StatusBadge'

const mapStyle = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap Contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm', minzoom: 0, maxzoom: 19 }],
}

const STATUS_COLOR = {
  'Assigned': '#f59e0b',
  'Picked-up': '#a78bfa',
  'In-Transit': '#00d4ff',
}

export default function AdminLiveTracking() {
  const { token } = useAuth()
  const mapRef = useRef(null)
  const [orders, setOrders] = useState([])
  const [agents, setAgents] = useState({})
  const [routes, setRoutes] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [popup, setPopup] = useState(null)
  const [search, setSearch] = useState('')
  const [reassignOrderId, setReassignOrderId] = useState(null)
  const [availableAgentsForReassign, setAvailableAgentsForReassign] = useState([])
  const [reassigning, setReassigning] = useState(false)

  const fetchActiveOrders = async () => {
    setLoading(true)
    try {
      const res = await adminAPI.getOrders(token, { limit: 100 })
      if (res.success) {
        const active = res.data.data.filter(o => ['Assigned', 'Picked-up', 'In-Transit'].includes(o.status))
        setOrders(active)
        fetchRoutes(active)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoutes = async (orderList) => {
    const routeMap = {}
    await Promise.all(
      orderList.map(async (order) => {
        if (!order.pickupLat || !order.dropLat) return
        try {
          const url = `https://router.project-osrm.org/route/v1/driving/${order.pickupLng},${order.pickupLat};${order.dropLng},${order.dropLat}?overview=full&geometries=geojson`
          const res = await fetch(url)
          const json = await res.json()
          if (json.routes && json.routes.length > 0) {
            const coords = json.routes[0].geometry.coordinates
            coords.unshift([order.pickupLng, order.pickupLat])
            coords.push([order.dropLng, order.dropLat])
            routeMap[order.id] = {
              type: 'Feature',
              geometry: { type: 'LineString', coordinates: coords },
            }
          }
        } catch (e) {
          // Fallback: straight line
          routeMap[order.id] = {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[order.pickupLng, order.pickupLat], [order.dropLng, order.dropLat]] },
          }
        }
      })
    )
    setRoutes(routeMap)
  }

  useEffect(() => {
    fetchActiveOrders()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!token) return
    const socket = connectSocket(token)
    socket.on('agent:locationBroadcast', (update) => {
      setAgents(prev => ({
        ...prev,
        [update.agentId]: { lat: update.lat, lng: update.lng, updatedAt: update.timestamp }
      }))
    })
    socket.on('order:statusChanged', (data) => {
      setOrders(prev => {
        if (['Delivered', 'Cancelled'].includes(data.status)) {
          return prev.filter(o => o.id !== data.orderId)
        }
        return prev.map(o => o.id === data.orderId ? { ...o, status: data.status } : o)
      })
    })
    return () => { 
      socket.off('agent:locationBroadcast') 
      socket.off('order:statusChanged')
    }
  }, [token])

  const flyToOrder = (order) => {
    setSelectedOrder(order.id)
    if (order.pickupLat && mapRef.current) {
      const midLat = ((order.pickupLat || 0) + (order.dropLat || 0)) / 2
      const midLng = ((order.pickupLng || 0) + (order.dropLng || 0)) / 2
      mapRef.current.flyTo({ center: [midLng, midLat], zoom: 13, duration: 1200 })
    }
  }

  const openReassignModal = async (orderId) => {
    setReassignOrderId(orderId)
    try {
      const res = await adminAPI.getAgents(token, { limit: 100, isAvailable: true, isActive: true })
      if (res.success) setAvailableAgentsForReassign(res.data.data)
    } catch { toast.error('Failed to fetch agents') }
  }

  const confirmReassign = async (agentId) => {
    setReassigning(true)
    try {
      const res = await adminAPI.assignOrder({ orderId: reassignOrderId, agentId }, token)
      if (res.success) {
        toast.success('Order Reassigned Successfully')
        setOrders(prev => prev.map(o => o.id === reassignOrderId ? { ...o, assignedAgentId: agentId, assignedAgent: res.data.assignedAgent, status: 'Assigned' } : o))
        setReassignOrderId(null)
      }
    } catch {
      toast.error('Failed to reassign order')
    }
    setReassigning(false)
  }

  const initialViewState = useMemo(() => {
    return { longitude: 77.2090, latitude: 28.6139, zoom: 10 }
  }, [])

  const activeRoutes = useMemo(() => {
    const computed = {}
    for (const [orderId, geoJSON] of Object.entries(routes)) {
      const order = orders.find(o => o.id === orderId)
      if (!order || !geoJSON || !geoJSON.geometry || !geoJSON.geometry.coordinates) {
        computed[orderId] = geoJSON
        continue
      }
      const agentLoc = agents[order.assignedAgentId]
      if (!agentLoc || !agentLoc.lat || !agentLoc.lng || order.status !== 'In-Transit') {
        computed[orderId] = geoJSON
        continue
      }
      
      const coords = geoJSON.geometry.coordinates
      let minDistance = Infinity
      let closestIndex = 0
      for (let i = 0; i < coords.length; i++) {
        const dist = Math.pow(coords[i][0] - agentLoc.lng, 2) + Math.pow(coords[i][1] - agentLoc.lat, 2)
        if (dist < minDistance) {
          minDistance = dist
          closestIndex = i
        }
      }
      const remainingCoords = coords.slice(closestIndex)
      remainingCoords.unshift([agentLoc.lng, agentLoc.lat])
      computed[orderId] = { type: 'Feature', geometry: { type: 'LineString', coordinates: remainingCoords } }
    }
    return computed
  }, [routes, agents, orders])

  const statusColor = (s) => STATUS_COLOR[s] || '#6b7280'

  return (
    <DashboardLayout role="admin">
      <div style={{ display: 'flex', height: 'calc(100vh - 72px)', gap: 0, overflow: 'hidden' }}>

        {/* ── Left Sidebar ── */}
        <div style={{ width: 340, minWidth: 340, height: '100%', overflow: 'hidden', background: 'var(--color-surface)', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
          <div style={{ padding: '1.25rem 1.25rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#00d4ff', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              <ArrowLeft size={13} /> Back to Dashboard
            </Link>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>🛰 Fleet Tracking</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)', marginBottom: '0.75rem' }}>Monitor all active deliveries in real-time</p>
            
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 10, padding: '0.6rem 0.75rem' }}>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(240,240,255,0.45)', marginBottom: 2 }}>Active Orders</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>{orders.length}</div>
              </div>
              <div style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 10, padding: '0.6rem 0.75rem' }}>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(240,240,255,0.45)', marginBottom: 2 }}>Live Agents</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Activity size={14} color="#00d4ff" />
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#00d4ff', lineHeight: 1 }}>{Object.keys(agents).length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,240,255,0.35)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search order ID or customer..."
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '0.45rem 2rem 0.45rem 2rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,240,255,0.4)', padding: 0, display: 'flex' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Refresh */}
          <div style={{ padding: '0.6rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={fetchActiveOrders}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: 'rgba(240,240,255,0.6)', cursor: 'pointer' }}
            >
              <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              Refresh
            </button>
          </div>

          {/* Orders List - scrollable */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.75rem' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.5rem' }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ height: 110, background: 'rgba(255,255,255,0.04)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '3rem', color: 'rgba(240,240,255,0.3)' }}>
                <Package size={40} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>No active deliveries</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>All orders are delivered!</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {orders
                  .filter(o => {
                    const q = search.toLowerCase()
                    return !q || o.orderNumber.toLowerCase().includes(q) || o.customer?.name?.toLowerCase().includes(q)
                  })
                  .map(order => {
                  const isSelected = selectedOrder === order.id
                  const color = statusColor(order.status)
                  const q = search.toLowerCase()
                  const highlightText = (text = '') => {
                    if (!q || !text.toLowerCase().includes(q)) return text
                    const idx = text.toLowerCase().indexOf(q)
                    return (
                      <>
                        {text.slice(0, idx)}
                        <mark style={{ background: 'rgba(0,212,255,0.3)', color: '#fff', borderRadius: 2, padding: '0 1px' }}>{text.slice(idx, idx + q.length)}</mark>
                        {text.slice(idx + q.length)}
                      </>
                    )
                  }
                  return (
                    <div
                      key={order.id}
                      onClick={() => flyToOrder(order)}
                      style={{
                        background: isSelected ? `rgba(${color === '#00d4ff' ? '0,212,255' : color === '#a78bfa' ? '167,139,250' : '245,158,11'},0.12)` : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: 12,
                        padding: '0.875rem 1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        borderLeft: `4px solid ${color}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>{highlightText(order.orderNumber)}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <MapPin size={10} color="#a78bfa" style={{ marginTop: 3, flexShrink: 0 }} />
                        <div style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.55)', lineHeight: 1.3 }}>
                          {order.pickupAddress?.length > 50 ? order.pickupAddress.slice(0, 50) + '…' : order.pickupAddress}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                        <MapPin size={10} color="#34d399" style={{ marginTop: 3, flexShrink: 0 }} />
                        <div style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.55)', lineHeight: 1.3 }}>
                          {order.dropAddress?.length > 50 ? order.dropAddress.slice(0, 50) + '…' : order.dropAddress}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'rgba(240,240,255,0.4)' }}>
                          <User size={10} />
                          {highlightText(order.customer?.name || 'Customer')}
                        </div>
                        {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); openReassignModal(order.id); }}
                            style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 6, padding: '0.2rem 0.6rem', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Reassign
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Legend */}
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { color: '#f59e0b', label: 'Assigned' },
              { color: '#a78bfa', label: 'Picked Up' },
              { color: '#00d4ff', label: 'In Transit' },
              { color: '#34d399', label: 'Drop Point' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'rgba(240,240,255,0.6)' }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Map ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Map
            ref={mapRef}
            initialViewState={initialViewState}
            mapStyle={mapStyle}
            style={{ width: '100%', height: '100%' }}
            mapLib={maplibregl}
            onClick={() => setPopup(null)}
          >
            <NavigationControl position="bottom-right" />

            {/* ── Route Lines ── */}
            {Object.entries(activeRoutes).map(([orderId, geoJSON]) => {
              const order = orders.find(o => o.id === orderId)
              const color = order ? statusColor(order.status) : '#00d4ff'
              const isSelected = selectedOrder === orderId
              return (
                <Source key={`route-src-${orderId}`} id={`route-src-${orderId}`} type="geojson" data={geoJSON}>
                  {/* Shadow line */}
                  <Layer
                    id={`route-shadow-${orderId}`}
                    type="line"
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{
                      'line-color': '#000',
                      'line-width': isSelected ? 8 : 6,
                      'line-opacity': 0.25,
                      'line-blur': 4,
                    }}
                  />
                  {/* Main route line */}
                  <Layer
                    id={`route-line-${orderId}`}
                    type="line"
                    layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                    paint={{
                      'line-color': color,
                      'line-width': isSelected ? 5 : 3.5,
                      'line-opacity': isSelected ? 1 : 0.75,
                    }}
                  />
                </Source>
              )
            })}
            {orders.map(order => {
              const color = statusColor(order.status)
              return (
                <div key={order.id}>
                  {/* Pickup Marker */}
                  {order.pickupLat && (
                    <Marker longitude={order.pickupLng} latitude={order.pickupLat} anchor="bottom">
                      <div
                        onClick={() => setPopup({ type: 'pickup', order })}
                        style={{
                          background: '#a78bfa',
                          color: '#fff',
                          padding: '5px 10px',
                          borderRadius: 8,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          boxShadow: '0 4px 16px rgba(167,139,250,0.5)',
                          border: selectedOrder === order.id ? '2px solid white' : '1px solid rgba(255,255,255,0.4)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transform: selectedOrder === order.id ? 'scale(1.1)' : 'scale(1)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        📦 Pickup
                      </div>
                    </Marker>
                  )}

                  {/* Drop Marker */}
                  {order.dropLat && (
                    <Marker longitude={order.dropLng} latitude={order.dropLat} anchor="bottom">
                      <div
                        onClick={() => setPopup({ type: 'drop', order })}
                        style={{
                          background: '#34d399',
                          color: '#0a0a12',
                          padding: '5px 10px',
                          borderRadius: 8,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          boxShadow: '0 4px 16px rgba(52,211,153,0.5)',
                          border: selectedOrder === order.id ? '2px solid white' : '1px solid rgba(255,255,255,0.4)',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          transform: selectedOrder === order.id ? 'scale(1.1)' : 'scale(1)',
                          transition: 'transform 0.2s',
                        }}
                      >
                        🏠 Drop
                      </div>
                    </Marker>
                  )}

                  {/* Order number badge near pickup */}
                  {order.pickupLat && (
                    <Marker longitude={order.pickupLng} latitude={order.pickupLat} anchor="top">
                      <div style={{
                        background: `${color}22`,
                        border: `1px solid ${color}`,
                        color: color,
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        marginTop: 4,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }} onClick={() => flyToOrder(order)}>
                        {order.orderNumber}
                      </div>
                    </Marker>
                  )}
                </div>
              )
            })}

            {/* Agent markers */}
            {Object.entries(agents).map(([agentId, location]) => {
              if (!location?.lat || !location?.lng) return null
              return (
                <AnimatedVehicleMarker
                  key={`agent-${agentId}`}
                  position={{ lat: location.lat, lng: location.lng }}
                  vehicleType={agents[agentId]?.vehicleType || 'bike'}
                  glideDuration={3000}
                />
              )
            })}

            {/* Popup on click */}
            {popup && (
              <Popup
                longitude={popup.type === 'pickup' ? popup.order.pickupLng : popup.order.dropLng}
                latitude={popup.type === 'pickup' ? popup.order.pickupLat : popup.order.dropLat}
                anchor="bottom"
                onClose={() => setPopup(null)}
                closeButton={true}
                closeOnClick={false}
                style={{ zIndex: 20 }}
              >
                <div style={{ minWidth: 200, padding: '0.5rem', fontFamily: 'inherit' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.35rem', color: popup.type === 'pickup' ? '#a78bfa' : '#34d399' }}>
                    {popup.type === 'pickup' ? '📦 Pickup Point' : '🏠 Drop Point'}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem' }}>{popup.order.orderNumber}</div>
                  <div style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.4, marginBottom: '0.3rem' }}>
                    {popup.type === 'pickup' ? popup.order.pickupAddress : popup.order.dropAddress}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
                    <User size={11} color="#888" />
                    <span style={{ fontSize: '0.72rem', color: '#666' }}>{popup.order.customer?.name}</span>
                  </div>
                </div>
              </Popup>
            )}
          </Map>

          {/* No agent overlay */}
          {Object.keys(agents).length === 0 && !loading && (
            <div style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(10,10,18,0.85)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
              padding: '0.6rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              fontSize: '0.78rem', color: 'rgba(240,240,255,0.6)', whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}>
              <Activity size={13} color="#f59e0b" />
              No agents are broadcasting live location yet
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
