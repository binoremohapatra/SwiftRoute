import { useState, useEffect } from 'react'
import { Package, CheckCircle, ArrowRight, MapPin, Search, Navigation, Banknote, Clock, User, ChevronRight, Truck } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import StatusBadge from '../../components/ui/StatusBadge'
import { SkeletonCard } from '../../components/ui/SkeletonLoader'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { orderAPI, agentAPI, paymentAPI } from '../../services/api'

const nextStatus = {
  Assigned:    'Picked-up',
  'Picked-up': 'In-Transit',
  'In-Transit': 'Delivered',
}

const actionLabel = {
  'Picked-up':  'Confirm Pickup',
  'In-Transit': 'Start Transit',
  'Delivered':  'Mark Delivered',
}

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

// Route visual used inside the hero card
function HeroRouteVisual({ status }) {
  const pct = status === 'Assigned' ? 0 : status === 'Picked-up' ? 30 : status === 'In-Transit' ? 65 : 100
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {/* Dotted route line with progress fill */}
      <div style={{ position: 'relative', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: 'var(--color-surface)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} />
          <span style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.45)' }}>Pickup</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.45)' }}>Drop-off</span>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
        </div>
      </div>
    </div>
  )
}

export default function AgentDeliveries() {
  const { token } = useAuth()
  const toast     = useToast()

  const [orders,   setOrders]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(null)
  const [filter,   setFilter]   = useState('active')
  const [search,   setSearch]   = useState('')

  const fetchOrders = () => {
    agentAPI.getDeliveries(token, { limit: 100, sortOrder: 'desc' })
      .then(res => {
        if (res.success) setOrders(res.data.data || [])
        setLoading(false)
      })
      .catch(() => {
        toast.error('Failed to load deliveries')
        setLoading(false)
      })
  }

  useEffect(() => { fetchOrders() }, [token, toast])

  const handleUpdateStatus = async (o, status) => {
    if (status === 'Picked-up' || status === 'Delivered') {
      if (!navigator.geolocation) return toast.error('Error', 'Geolocation is not supported by your browser')
      setUpdating(o.id)
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords
        const targetLat = status === 'Picked-up' ? o.pickupLat : o.dropLat
        const targetLng = status === 'Picked-up' ? o.pickupLng : o.dropLng
        const distance  = getDistance(latitude, longitude, targetLat, targetLng)
        if (distance > 5) {
          toast.error('Location Error', `You are ${Math.round(distance)}m away. You must be within 5m to mark as ${status}!`)
          setUpdating(null); return
        }
        executeStatusUpdate(o.id, status)
      }, () => {
        toast.error('Location Required', 'Allow location access to update status')
        setUpdating(null)
      }, { enableHighAccuracy: true })
    } else {
      executeStatusUpdate(o.id, status)
    }
  }

  const executeStatusUpdate = async (id, status) => {
    setUpdating(id)
    try {
      const res = await orderAPI.updateStatus(id, { status }, token)
      if (res.success || res.statusCode === 200) {
        toast.success('Status Updated', `Order is now ${status}`)
        fetchOrders()
      } else toast.error('Update Failed', res.message)
    } catch { toast.error('Update Failed', 'Could not update order status') }
    setUpdating(null)
  }

  const handleCollectCashAndDeliver = async (o) => {
    setUpdating(o.id)
    try {
      const payRes = await paymentAPI.collectCash({ orderId: o.id }, token)
      if (payRes.success) {
        const res = await orderAPI.updateStatus(o.id, { status: 'Delivered' }, token)
        if (res.success || res.statusCode === 200) {
          toast.success('Cash Collected & Delivered!', 'Order completed successfully.')
          fetchOrders()
        }
      } else toast.error('Failed to collect cash', payRes.message)
    } catch { toast.error('Failed', 'Could not process cash collection') }
    setUpdating(null)
  }

  const activeOrders    = orders.filter(o => ['Assigned','Picked-up','In-Transit'].includes(o.status))
  const deliveredOrders = orders.filter(o => o.status === 'Delivered')

  const filtered = orders.filter(o => {
    const matchesSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    if (filter === 'active') return ['Assigned','Picked-up','In-Transit'].includes(o.status)
    return o.status === 'Delivered'
  })

  // Single active order — hero view
  const singleActive = activeOrders.length === 1 ? activeOrders[0] : null

  return (
    <DashboardLayout role="agent">
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">My Deliveries</h2>
            <p className="dash-page-sub">
              {loading ? 'Loading your assignments…'
                : activeOrders.length === 0 ? 'No active deliveries right now'
                : `${activeOrders.length} active delivery${activeOrders.length !== 1 ? 'ies' : ''} in progress`
              }
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 350px), 1fr))', gap: '1.25rem' }}>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        ) : (
          <>
            {/* ═══ HERO VIEW — single active order ═══ */}
            {/* ═══ HERO VIEW — single active order ═══ */}
            {singleActive && filter === 'active' && !search && (
              <div className="order-list-card" style={{ marginBottom: '1.5rem', borderTop: '3px solid #6366f1', padding: 0 }}>
                {/* Active pulse banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.125rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(99,102,241,0.08)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'badgeDotPulse 1.5s infinite' }} />
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    Active Delivery
                  </span>
                  <StatusBadge status={singleActive.status} style={{ marginLeft: 'auto' }} />
                </div>

                {/* PRIMARY — order# + date */}
                <div className="order-list-card-primary">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                    <span className="dash-order-num" style={{ fontSize: '0.82rem', flexShrink: 0 }}>{singleActive.orderNumber}</span>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.35)' }}>
                      {new Date(singleActive.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* SECONDARY — route */}
                <div className="order-list-card-secondary" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                      <MapPin size={12} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: 'rgba(240,240,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{singleActive.pickupAddress || 'Pickup location'}</span>
                    </div>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${singleActive.pickupLat},${singleActive.pickupLng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: '#8b5cf6', textDecoration: 'none', background: 'rgba(139,92,246,0.1)', padding: '0.25rem 0.5rem', borderRadius: 6, flexShrink: 0 }}>
                      <Navigation size={10} /> Navigate
                    </a>
                  </div>
                  
                  <HeroRouteVisual status={singleActive.status} />
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                      <MapPin size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.82rem', color: 'rgba(240,240,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{singleActive.dropAddress || 'Drop location'}</span>
                    </div>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${singleActive.dropLat},${singleActive.dropLng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: '#10b981', textDecoration: 'none', background: 'rgba(16,185,129,0.1)', padding: '0.25rem 0.5rem', borderRadius: 6, flexShrink: 0 }}>
                      <Navigation size={10} /> Navigate
                    </a>
                  </div>
                </div>

                {/* TERTIARY — customer & actions */}
                <div className="order-list-card-tertiary" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', marginTop: '0.25rem' }}>
                  {singleActive.customer && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                          {singleActive.customer?.name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{singleActive.customer?.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(240,240,255,0.35)' }}>{singleActive.customer?.phone}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: singleActive.paymentMethod === 'COD' ? '#fbbf24' : '#10b981', flexShrink: 0 }}>
                        ₹{singleActive.amount}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '0.25rem', paddingBottom: '0.25rem' }}>
                    {nextStatus[singleActive.status] && (
                      nextStatus[singleActive.status] === 'Delivered' && singleActive.paymentMethod === 'COD' && singleActive.paymentStatus !== 'PAID' ? (
                        <button
                          onClick={() => handleCollectCashAndDeliver(singleActive)}
                          disabled={updating === singleActive.id}
                          className="btn-primary btn-glow"
                          style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', justifyContent: 'center', background: 'var(--color-surface)' }}
                        >
                          {updating === singleActive.id
                            ? <><span className="dash-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processing…</>
                            : <><Banknote size={14} /> Collect ₹{singleActive.amount} & Deliver</>
                          }
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(singleActive, nextStatus[singleActive.status])}
                          disabled={updating === singleActive.id}
                          className={`btn-primary ${nextStatus[singleActive.status] === 'Delivered' ? 'btn-glow' : ''}`}
                          style={{
                            width: '100%', padding: '0.75rem', fontSize: '0.85rem', justifyContent: 'center',
                            background: nextStatus[singleActive.status] === 'Delivered' ? 'linear-gradient(135deg,#10b981,#10b981)' : '',
                            color: nextStatus[singleActive.status] === 'Delivered' ? '#0a0a12' : '#fff'
                          }}
                        >
                          {updating === singleActive.id
                            ? <><span className="dash-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Updating…</>
                            : <>{actionLabel[nextStatus[singleActive.status]]} <ArrowRight size={14} /></>
                          }
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TOOLBAR (search + tabs) — only shown for queue view ═══ */}
            {!(singleActive && filter === 'active' && !search) || search ? (
              <div className="glass-card" style={{ padding: '1rem', marginBottom: '1.5rem', borderRadius: 16 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
                    <Search size={15} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,240,255,0.3)' }} />
                    <input
                      className="dash-input"
                      placeholder="Search by order number…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      style={{ paddingLeft: '2.5rem', borderRadius: 12, height: 42, fontSize: '0.9rem' }}
                    />
                  </div>
                  <div className="filter-chips">
                    {['active', 'delivered'].map(f => {
                      const count = f === 'active' ? activeOrders.length : deliveredOrders.length
                      return (
                        <button key={f} onClick={() => setFilter(f)}
                          className={`filter-chip${filter === f ? ' active' : ''}`}
                          style={{ textTransform: 'capitalize' }}
                        >
                          {f}
                          <span style={{ padding: '0 5px', background: filter === f ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.1)', borderRadius: 10, fontSize: '0.65rem', color: filter === f ? '#6366f1' : 'rgba(240,240,255,0.5)' }}>
                            {count}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : null}



            {/* ═══ QUEUE / CARD LIST ═══ */}
            {filtered.length === 0 ? (
              <div style={{ marginTop: '2rem' }}>
                <div className="dash-empty">
                  {filter === 'active' ? (
                    <>
                      <Package size={56} strokeWidth={1} color="var(--text-muted)" style={{ marginBottom: '1.25rem', opacity: 0.5 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'rgba(240,240,255,0.45)', marginBottom: '0.4rem' }}>
                        All clear for now
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.25)', maxWidth: 260, textAlign: 'center', lineHeight: 1.6 }}>
                        New orders will appear here automatically when assigned to you
                      </p>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={56} strokeWidth={1} color="var(--status-delivered)" style={{ marginBottom: '1.25rem', opacity: 0.4 }} />
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'rgba(240,240,255,0.45)', marginBottom: '0.4rem' }}>
                        No deliveries completed yet
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.25)', maxWidth: 240, textAlign: 'center', lineHeight: 1.6 }}>
                        Your completed deliveries will show up here
                      </p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Skip hero orders in the card grid when already shown as hero above */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filtered
                  .filter(o => !(singleActive && o.id === singleActive.id && filter === 'active' && !search))
                  .map((o, idx) => {
                    const isNextDelivered = nextStatus[o.status] === 'Delivered'
                    return (
                      <div key={o.id} className="order-list-card" style={{ animation: `staggerUp 0.3s ${idx * 0.04}s both`, borderTop: `3px solid ${o.status === 'Delivered' ? '#10b981' : '#6366f1'}` }}>

                        {/* PRIMARY — order# + status */}
                        <div className="order-list-card-primary">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                            <span className="dash-order-num" style={{ fontSize: '0.82rem', flexShrink: 0 }}>{o.orderNumber}</span>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.35)' }}>
                              {new Date(o.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <StatusBadge status={o.status} />
                        </div>

                        {/* SECONDARY — route */}
                        <div className="order-list-card-secondary" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.6rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                              <MapPin size={12} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.82rem', color: 'rgba(240,240,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.pickupAddress || 'Pickup location'}</span>
                            </div>
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.pickupLat},${o.pickupLng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: '#8b5cf6', textDecoration: 'none', background: 'rgba(139,92,246,0.1)', padding: '0.25rem 0.5rem', borderRadius: 6, flexShrink: 0 }}>
                              <Navigation size={10} /> Navigate
                            </a>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden' }}>
                              <MapPin size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.82rem', color: 'rgba(240,240,255,0.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.dropAddress || 'Drop location'}</span>
                            </div>
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.dropLat},${o.dropLng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.65rem', color: '#10b981', textDecoration: 'none', background: 'rgba(16,185,129,0.1)', padding: '0.25rem 0.5rem', borderRadius: 6, flexShrink: 0 }}>
                              <Navigation size={10} /> Navigate
                            </a>
                          </div>
                        </div>

                        {/* TERTIARY — customer & actions */}
                        <div className="order-list-card-tertiary" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem', marginTop: '0.25rem' }}>
                          {o.customer && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '0.5rem 0.75rem', borderRadius: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                                  {o.customer?.name?.[0]?.toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer?.name}</div>
                                  <div style={{ fontSize: '0.7rem', color: 'rgba(240,240,255,0.35)' }}>{o.customer?.phone}</div>
                                </div>
                              </div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: o.paymentMethod === 'COD' ? '#fbbf24' : '#10b981', flexShrink: 0 }}>
                                ₹{o.amount}
                              </div>
                            </div>
                          )}

                          {nextStatus[o.status] ? (
                            isNextDelivered && o.paymentMethod === 'COD' && o.paymentStatus !== 'PAID' ? (
                              <button onClick={() => handleCollectCashAndDeliver(o)} disabled={updating === o.id} className="btn-primary btn-glow" style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', justifyContent: 'center', background: 'var(--color-surface)' }}>
                                {updating === o.id ? <><span className="dash-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Processing…</> : <><Banknote size={14} /> Collect ₹{o.amount} & Deliver</>}
                              </button>
                            ) : (
                              <button onClick={() => handleUpdateStatus(o, nextStatus[o.status])} disabled={updating === o.id} className={`btn-primary${isNextDelivered ? ' btn-glow' : ''}`} style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem', justifyContent: 'center', background: isNextDelivered ? 'linear-gradient(135deg,#10b981,#10b981)' : '', color: isNextDelivered ? '#0a0a12' : '#fff' }}>
                                {updating === o.id ? <><span className="dash-loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Updating…</> : <>{actionLabel[nextStatus[o.status]]} <ArrowRight size={14} /></>}
                              </button>
                            )
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', borderRadius: 10, background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.15)', color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
                              <CheckCircle size={14} /> Delivered
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
