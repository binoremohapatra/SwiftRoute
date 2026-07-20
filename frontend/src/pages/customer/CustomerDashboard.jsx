import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, CheckCircle, XCircle, Plus, ArrowRight, MapPin, Zap } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import { useAuth } from '../../context/AuthContext'
import { orderAPI } from '../../services/api'

// Animated route line SVG for the live-order hero visual
function LiveRouteVisual() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" style={{ opacity: 0.7 }}>
      {/* Dashed base route */}
      <path d="M10 70 C 30 40 50 55 60 35 C 70 15 90 25 110 10"
        stroke="rgba(0,212,255,0.15)" strokeWidth="2.5" strokeDasharray="5 4" strokeLinecap="round" fill="none" />
      {/* Animated progress line */}
      <path className="track-route-draw"
        d="M10 70 C 30 40 50 55 60 35 C 70 15 90 25 110 10"
        stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" fill="none"
        strokeDasharray="180" strokeDashoffset="180" />
      {/* Pickup dot */}
      <circle cx="10" cy="70" r="5" fill="#8b5cf6" />
      {/* Destination dot */}
      <circle cx="110" cy="10" r="5" fill="#10b981" />
      {/* Glowing rider dot — animated along path */}
      <circle cx="60" cy="35" r="7" fill="rgba(0,212,255,0.15)" />
      <circle cx="60" cy="35" r="4" fill="#6366f1">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

export default function CustomerDashboard() {
  const { token, user } = useAuth()
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    orderAPI.getAll(token).then((res) => {
      if (res.statusCode === 200) setOrders(res.data.data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [token])

  const active    = orders.filter(o => !['Delivered','Cancelled'].includes(o.status))
  const delivered = orders.filter(o => o.status === 'Delivered')
  const cancelled = orders.filter(o => o.status === 'Cancelled')
  const liveOrder = orders.find(o => o.status === 'In-Transit' || o.status === 'Picked-up')

  const firstName = user?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <DashboardLayout>
      <div className="dash-page">

        {/* ── Hero greeting ── */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(0,212,255,0.12)',
          borderRadius: 20,
          padding: '1.75rem 2rem',
          marginBottom: liveOrder ? '1.5rem' : 'var(--space-section)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          position: 'relative',
          overflow: 'hidden',
          animation: 'staggerUp 0.4s both',
        }}>
          <div style={{
            position: 'absolute', right: -30, top: -30,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.08), transparent)',
            pointerEvents: 'none',
          }} />
          <div>
            <p style={{ fontSize: '0.82rem', color: 'rgba(240,240,255,0.45)', fontWeight: 500, marginBottom: '0.25rem' }}>
              {greeting} 👋
            </p>
            <h1 className="dash-page-title" style={{ marginBottom: '0.35rem' }}>
              Welcome back, <span style={{ color: '#6366f1' }}>{firstName}</span>
            </h1>
            <p className="dash-page-sub">
              {loading
                ? 'Fetching your deliveries…'
                : active.length > 0
                  ? `${active.length} active order${active.length !== 1 ? 's' : ''} in motion right now`
                  : 'All deliveries complete — place a new order anytime'
              }
            </p>
          </div>
          <Link
            to="/dashboard/orders/new"
            className="btn-primary btn-glow"
            style={{ fontSize: '0.9rem', padding: '0.75rem 1.5rem', borderRadius: 14, textDecoration: 'none', display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}
          >
            <Plus size={16} /> Place New Order
          </Link>
        </div>

        {/* ── LIVE ORDER HERO — shown when in-transit ── */}
        {liveOrder && (
          <div className="live-order-hero">
            {/* Live pulse top-bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', borderBottom: '1px solid rgba(0,212,255,0.1)', background: 'rgba(0,212,255,0.04)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', animation: 'badgeDotPulse 1.5s infinite' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Live Delivery in Progress
              </span>
              <div style={{ marginLeft: 'auto' }}>
                <StatusBadge status={liveOrder.status} />
              </div>
            </div>
            <div className="live-order-hero-inner">
              {/* Left: info 65% */}
              <div className="live-order-hero-info">
                <div>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(240,240,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
                    Order Number
                  </p>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    {liveOrder.orderNumber}
                  </div>
                  {liveOrder.pickupAddress && (
                    <div style={{ fontSize: '0.82rem', color: 'rgba(240,240,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={12} style={{ flexShrink: 0, color: '#8b5cf6' }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {liveOrder.pickupAddress}
                      </span>
                      <span style={{ color: 'rgba(240,240,255,0.25)', flexShrink: 0 }}>→</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#10b981' }}>
                        {liveOrder.dropAddress}
                      </span>
                    </div>
                  )}
                </div>
                <Link
                  to={`/dashboard/track?id=${liveOrder._id}`}
                  className="btn-primary btn-glow"
                  style={{ fontSize: '0.875rem', padding: '0.7rem 1.375rem', borderRadius: 12, textDecoration: 'none', display: 'inline-flex', gap: '0.5rem', alignItems: 'center', alignSelf: 'flex-start' }}
                >
                  <MapPin size={15} /> Track This Order
                </Link>
              </div>
              {/* Right: visual 35% */}
              <div className="live-order-hero-visual">
                <LiveRouteVisual />
                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(240,240,255,0.3)', textAlign: 'center', letterSpacing: '0.05em' }}>
                  ROUTE ACTIVE
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Asymmetric stat strip ── */}
        <div className="customer-stat-strip stagger-list">
          {/* Total Orders — deliberately wider primary card */}
          <StatCard label="Total Orders"  value={orders.length}    icon={Package}     loading={loading} />
          <StatCard label="Active"        value={active.length}    icon={Clock}       color="var(--accent-indigo)" loading={loading} />
          <StatCard label="Delivered"     value={delivered.length} icon={CheckCircle} loading={loading} />
          <StatCard label="Cancelled"     value={cancelled.length} icon={XCircle}     color="#ef4444"  loading={loading} />
        </div>

        {/* ── Recent Orders ── */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Recent Orders</h3>
            <Link
              to="/dashboard/orders"
              style={{ color: '#6366f1', textDecoration: 'none', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 6 }} />
                  <div className="skeleton" style={{ width: 70, height: 22, borderRadius: 999 }} />
                  <div className="skeleton" style={{ flex: 1, height: 14, borderRadius: 6 }} />
                  <div className="skeleton" style={{ width: 60, height: 14, borderRadius: 6 }} />
                </div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            /* Custom empty state */
            <div className="dash-empty">
              <svg className="empty-state-svg" width="120" height="100" viewBox="0 0 120 100" fill="none" style={{ marginBottom: '1.25rem' }}>
                <rect x="30" y="30" width="60" height="52" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
                <line x1="60" y1="30" x2="60" y2="82" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
                <line x1="37" y1="50" x2="83" y2="50" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
                <path d="M30 30 L42 18 L78 18 L90 30" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
                <circle cx="60" cy="95" r="3" fill="rgba(0,212,255,0.3)" />
                <circle cx="48" cy="91" r="2" fill="rgba(0,212,255,0.15)" />
                <circle cx="72" cy="91" r="2" fill="rgba(0,212,255,0.15)" />
              </svg>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'rgba(240,240,255,0.5)', marginBottom: '0.4rem' }}>
                Your first delivery is just a tap away
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.28)', maxWidth: 260, textAlign: 'center', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Place an order and track it live from pickup to your door
              </p>
              <Link to="/dashboard/orders/new" className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.65rem 1.25rem', textDecoration: 'none' }}>
                <Plus size={15} /> Place First Order
              </Link>
            </div>
          ) : (
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Status</th>
                    <th>Pickup</th>
                    <th>Drop</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 6).map((o, idx) => (
                    <tr key={o._id} style={{ animation: `staggerUp 0.35s ${idx * 0.05}s both` }}>
                      <td data-label="Order #"><span className="dash-order-num">{o.orderNumber}</span></td>
                      <td data-label="Status"><StatusBadge status={o.status} /></td>
                      <td data-label="Pickup" className="dash-address" title={o.pickupAddress}>
                        {o.pickupAddress || `${o.pickupLat?.toFixed(3)}, ${o.pickupLng?.toFixed(3)}`}
                      </td>
                      <td data-label="Drop" className="dash-address" title={o.dropAddress}>
                        {o.dropAddress || `${o.dropLat?.toFixed(3)}, ${o.dropLng?.toFixed(3)}`}
                      </td>
                      <td data-label="Date" style={{ color: 'rgba(240,240,255,0.4)', fontSize: '0.8rem' }}>
                        {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </td>
                      <td data-label="Action">
                        <Link
                          to={`/dashboard/track?id=${o._id}`}
                          style={{
                            color: '#6366f1', textDecoration: 'none', fontSize: '0.8rem',
                            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                            fontWeight: 600, opacity: ['Delivered','Cancelled'].includes(o.status) ? 0.4 : 1,
                          }}
                        >
                          <MapPin size={13} /> Track
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
