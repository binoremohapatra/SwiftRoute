import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, CheckCircle, XCircle, Plus, ArrowRight, MapPin, Zap } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import StatCard from '../../components/ui/StatCard'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { orderAPI } from '../../services/api'

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
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(79,70,229,0.05))',
          border: '1px solid rgba(99,102,241,0.12)',
          borderRadius: 20,
          padding: '1.75rem 2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* bg decoration */}
          <div style={{
            position: 'absolute', right: -30, top: -30,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent)',
            pointerEvents: 'none',
          }} />

          <div>
            <p style={{ fontSize: '0.82rem', color: 'rgba(245,245,247,0.45)', fontWeight: 500, marginBottom: '0.25rem' }}>
              {greeting} 👋
            </p>
            <h1 className="dash-page-title" style={{ marginBottom: '0.35rem' }}>
              Welcome back, <span style={{ color: '#6366f1' }}>{firstName}</span>
            </h1>
            <p className="dash-page-sub">
              {loading ? 'Loading your orders...' : `You have ${active.length} active order${active.length !== 1 ? 's' : ''} right now`}
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

        {/* ── Stat cards ── */}
        <div className="dash-stats-grid stagger-list" style={{ marginBottom: '1.5rem' }}>
          <StatCard label="Total Orders"   value={orders.length}    icon={Package}     color="#6366f1"  loading={loading} />
          <StatCard label="Active"         value={active.length}    icon={Clock}       color="#818cf8"  loading={loading} />
          <StatCard label="Delivered"      value={delivered.length} icon={CheckCircle} color="#34d399"  loading={loading} />
          <StatCard label="Cancelled"      value={cancelled.length} icon={XCircle}     color="#f87171"  loading={loading} />
        </div>

        {/* ── Live order card ── */}
        {liveOrder && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(79,70,229,0.07))',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 18,
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            animation: 'staggerUp 0.4s 0.3s both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'livePulse 2s infinite',
              }}>
                <Zap size={20} color="#6366f1" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: 'badgeDotPulse 1.5s infinite' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Live Delivery
                  </span>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  Order <span style={{ fontFamily: 'monospace', color: '#6366f1' }}>{liveOrder.orderNumber}</span> is on its way!
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(245,245,247,0.45)', marginTop: 2 }}>
                  Status: <StatusBadge status={liveOrder.status} />
                </div>
              </div>
            </div>
            <Link
              to={`/dashboard/track?id=${liveOrder._id}`}
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem', borderRadius: 12, textDecoration: 'none', display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <MapPin size={15} /> Track Live
            </Link>
          </div>
        )}

        {/* ── Recent Orders ── */}
        <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 18 }}>
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
            <EmptyState
              icon="orders"
              title="No orders yet"
              subtitle="Place your first order and track it in real time"
              action={
                <Link to="/dashboard/orders/new" className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.65rem 1.25rem', textDecoration: 'none' }}>
                  <Plus size={15} /> Place Order
                </Link>
              }
            />
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
                      <td><span className="dash-order-num">{o.orderNumber}</span></td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="dash-address" title={o.pickupAddress}>
                        {o.pickupAddress || `${o.pickupLat?.toFixed(3)}, ${o.pickupLng?.toFixed(3)}`}
                      </td>
                      <td className="dash-address" title={o.dropAddress}>
                        {o.dropAddress || `${o.dropLat?.toFixed(3)}, ${o.dropLng?.toFixed(3)}`}
                      </td>
                      <td style={{ color: 'rgba(245,245,247,0.4)', fontSize: '0.8rem' }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td>
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
