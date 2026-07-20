import { useState, useEffect } from 'react'
import { Package, CheckCircle, ArrowRight, MapPin, Search, Navigation, Banknote } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/SkeletonLoader'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { orderAPI, agentAPI, paymentAPI } from '../../services/api'

const nextStatus = {
  Assigned: 'Picked-up',
  'Picked-up': 'In-Transit',
  'In-Transit': 'Delivered',
}

const statusLabel = {
  'Picked-up': 'Pick Up',
  'In-Transit': 'Start Transit',
  'Delivered': 'Mark Delivered',
}

// Haversine distance calculator (in meters)
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}

export default function AgentDeliveries() {
  const { token } = useAuth()
  const toast = useToast()
  
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)
  const [filter, setFilter] = useState('active')
  const [search, setSearch] = useState('')

  const fetchOrders = () => {
    agentAPI.getDeliveries(token, { limit: 100, sortOrder: 'desc' })
      .then((res) => {
        if (res.success) setOrders(res.data.data || [])
        setLoading(false)
      })
      .catch(() => {
        toast.error('Failed to load deliveries')
        setLoading(false)
      })
  }

  useEffect(() => {
    fetchOrders()
  }, [token, toast])

  const handleUpdateStatus = async (o, status) => {
    // Geofencing Check
    if (status === 'Picked-up' || status === 'Delivered') {
      if (!navigator.geolocation) {
        return toast.error("Error", "Geolocation is not supported by your browser");
      }
      
      setUpdating(o.id)
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        const targetLat = status === 'Picked-up' ? o.pickupLat : o.dropLat;
        const targetLng = status === 'Picked-up' ? o.pickupLng : o.dropLng;
        
        const distance = getDistance(latitude, longitude, targetLat, targetLng);
        
        if (distance > 500) {
          toast.error('Location Error', `You are ${Math.round(distance)}m away. You must be at the location!`);
          setUpdating(null);
          return;
        }

        // Proceed if within 500 meters
        executeStatusUpdate(o.id, status);
      }, (err) => {
        toast.error("Location Required", "Please allow location access to update status");
        setUpdating(null);
      }, { enableHighAccuracy: true });
    } else {
      executeStatusUpdate(o.id, status);
    }
  }

  const executeStatusUpdate = async (id, status) => {
    setUpdating(id)
    try {
      const res = await orderAPI.updateStatus(id, { status }, token)
      if (res.success || res.statusCode === 200) {
        toast.success('Order Updated', `Status changed to ${status}`)
        fetchOrders()
      } else {
        toast.error('Update Failed', res.message)
      }
    } catch {
      toast.error('Update Failed', 'Could not update order status')
    }
    setUpdating(null)
  }

  const handleCollectCashAndDeliver = async (o) => {
    setUpdating(o.id)
    try {
      // First collect cash
      const payRes = await paymentAPI.collectCash({ orderId: o.id }, token)
      if (payRes.success) {
        // Then mark delivered
        const res = await orderAPI.updateStatus(o.id, { status: 'Delivered' }, token)
        if (res.success || res.statusCode === 200) {
          toast.success('Cash Collected & Delivered!', `Order completed successfully.`)
          fetchOrders()
        }
      } else {
         toast.error('Failed to collect cash', payRes.message)
      }
    } catch {
      toast.error('Failed', 'Could not process cash collection')
    }
    setUpdating(null)
  }

  const filtered = orders.filter(o => {
    const matchesSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase())
    if (!matchesSearch) return false
    
    if (filter === 'active') return ['Assigned','Picked-up','In-Transit'].includes(o.status)
    return o.status === 'Delivered'
  })

  return (
    <DashboardLayout role="agent">
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">My Deliveries</h2>
            <p className="dash-page-sub">View and update your assigned orders</p>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          
          {/* Search */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,240,255,0.3)' }} />
            <input
              className="dash-input"
              placeholder="Search by order number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', borderRadius: 999 }}
            />
          </div>

          {/* Kanban Tabs */}
          <div className="kanban-tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
            {['active', 'delivered'].map((f) => {
              const count = orders.filter(o => f === 'active' ? ['Assigned','Picked-up','In-Transit'].includes(o.status) : o.status === 'Delivered').length
              return (
                <button 
                  key={f} 
                  className={`kanban-tab${filter === f ? ' active' : ''}`} 
                  onClick={() => setFilter(f)}
                  style={{ padding: '0.4rem 1rem', textTransform: 'capitalize', borderBottom: 'none', background: filter === f ? 'rgba(0,212,255,0.1)' : 'transparent', borderRadius: 999, border: `1px solid ${filter === f ? 'rgba(0,212,255,0.3)' : 'transparent'}` }}
                >
                  {f} Deliveries
                  <span className="kanban-tab-count" style={{ background: filter === f ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.1)', color: filter === f ? '#00d4ff' : 'rgba(240,240,255,0.5)' }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.25rem' }}>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ marginTop: '2rem' }}>
            <EmptyState 
              icon="agent" 
              title={search ? 'No matches found' : `No ${filter} deliveries`} 
              subtitle={search ? `Try adjusting your search criteria.` : filter === 'active' ? 'You have no active deliveries right now.' : 'You have not completed any deliveries yet.'} 
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.25rem' }}>
            {filtered.map((o, idx) => {
              const isNextDelivered = nextStatus[o.status] === 'Delivered'
              return (
                <div 
                  key={o.id} 
                  className="glass-card stagger-list" 
                  style={{ 
                    padding: '1.5rem', 
                    borderRadius: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    animation: `staggerUp 0.35s ${idx * 0.05}s both`,
                    borderTop: `4px solid ${o.status === 'Delivered' ? '#34d399' : '#00d4ff'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div>
                      <div className="dash-order-num" style={{ marginBottom: 8, display: 'inline-block' }}>{o.orderNumber}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.4)', marginTop: 4 }}>
                        {new Date(o.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MapPin size={14} color="#a78bfa" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Pickup</div>
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.pickupLat},${o.pickupLng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#a78bfa', background: 'rgba(167,139,250,0.1)', padding: '2px 8px', borderRadius: 4, textDecoration: 'none' }}>
                            <Navigation size={10} /> Navigate
                          </a>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4, marginTop: 4 }}>{o.pickupAddress}</div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MapPin size={14} color="#34d399" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Drop</div>
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${o.dropLat},${o.dropLng}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#34d399', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: 4, textDecoration: 'none' }}>
                            <Navigation size={10} /> Navigate
                          </a>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.4, marginTop: 4 }}>{o.dropAddress}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '1.25rem 0', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                        {o.customer?.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{o.customer?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)' }}>{o.customer?.phone}</div>
                      </div>
                    </div>
                  </div>

                  {nextStatus[o.status] ? (
                    <>
                      {isNextDelivered && o.paymentMethod === 'COD' && o.paymentStatus !== 'PAID' ? (
                        <button 
                          onClick={() => handleCollectCashAndDeliver(o)} 
                          disabled={updating === o.id}
                          className="btn-primary btn-glow"
                          style={{ 
                            width: '100%', padding: '0.875rem', fontSize: '0.9rem', justifyContent: 'center',
                            background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                            opacity: updating === o.id ? 0.7 : 1 
                          }}
                        >
                          {updating === o.id ? (
                            <><span className="dash-loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Processing...</>
                          ) : (
                            <><Banknote size={16} /> Collect ₹{o.amount} & Deliver</>
                          )}
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUpdateStatus(o, nextStatus[o.status])} 
                          disabled={updating === o.id}
                          className={`btn-primary ${isNextDelivered ? 'btn-glow' : ''}`}
                          style={{ 
                            width: '100%', 
                            padding: '0.875rem', 
                            fontSize: '0.9rem', 
                            justifyContent: 'center',
                            background: isNextDelivered ? 'linear-gradient(135deg, #34d399, #10b981)' : '',
                            color: isNextDelivered ? '#0a0a12' : '#fff',
                            opacity: updating === o.id ? 0.7 : 1 
                          }}
                        >
                          {updating === o.id ? (
                            <><span className="dash-loading-spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: isNextDelivered ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)', borderTopColor: isNextDelivered ? '#000' : '#fff' }} /> Updating...</>
                          ) : (
                            <>{statusLabel[nextStatus[o.status]]} <ArrowRight size={16} /></>
                          )}
                        </button>
                      )}
                    </>
                  ) : (
                    <div style={{ 
                      width: '100%', padding: '0.75rem', borderRadius: 12, 
                      background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                      color: '#34d399', fontSize: '0.85rem', fontWeight: 600
                    }}>
                      <CheckCircle size={16} /> Order Completed
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
