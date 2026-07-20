import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Package, Search, MapPin, XCircle, Star, Filter, CheckCircle, ArrowRight, ChevronRight } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import StatusBadge from '../../components/ui/StatusBadge'
import { SkeletonRow } from '../../components/ui/SkeletonLoader'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../context/AuthContext'
import { orderAPI } from '../../services/api'
import RatingModal from '../../components/RatingModal'

export default function MyOrders() {
  const { token } = useAuth()
  const toast = useToast()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [cancellingId, setCancellingId] = useState(null)
  const [ratingOrder, setRatingOrder] = useState(null)
  // Inline cancel confirm (avoids window.confirm)
  const [confirmCancelId, setConfirmCancelId] = useState(null)

  useEffect(() => {
    orderAPI.getAll(token).then((res) => {
      if (res.statusCode === 200) setOrders(res.data.data || [])
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load orders', 'Please check your connection.')
      setLoading(false)
    })
  }, [token, toast])

  const handleCancel = async (id) => {
    setConfirmCancelId(null)
    setCancellingId(id)
    try {
      const res = await orderAPI.cancel(id, token)
      if (res.statusCode === 200) {
        setOrders((prev) => prev.map((o) => (o._id === id || o.id === id) ? { ...o, status: 'Cancelled' } : o))
        toast.success('Order Cancelled', 'The order has been cancelled successfully.')
      } else {
        toast.error('Cancellation Failed', res.message)
      }
    } catch {
      toast.error('Cancellation Failed', 'An error occurred.')
    }
    setCancellingId(null)
  }

  const handleRateSubmit = async (orderId, rating, review) => {
    try {
      const res = await fetch(`http://localhost:5000/api/v1/orders/${orderId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, review })
      })
      const json = await res.json()
      if (res.ok && json.success) {
        toast.success('Rating submitted — thanks for the feedback!')
        setOrders(orders.map(o => (o.id === orderId || o._id === orderId) ? { ...o, rating } : o))
        setRatingOrder(null)
      } else {
        toast.error(json.message || 'Failed to submit rating')
        setRatingOrder(null)
      }
    } catch {
      toast.error('Network error')
      setRatingOrder(null)
    }
  }

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase())
      if (!matchesSearch) return false
      if (filter === 'Active')    return !['Delivered', 'Cancelled'].includes(o.status)
      if (filter === 'Completed') return o.status === 'Delivered'
      if (filter === 'Cancelled') return o.status === 'Cancelled'
      return true
    })
  }, [orders, search, filter])

  const activeCount = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length

  const PaymentChip = ({ o }) => {
    if (o.paymentStatus === 'PAID') return <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(52,211,153,0.1)', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle size={9} /> Paid</span>
    if (o.paymentMethod === 'COD') return <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>COD</span>
    return <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(248,113,113,0.1)', color: '#ef4444' }}>Failed</span>
  }

  return (
    <DashboardLayout>
      <div className="dash-page" style={{ overflow: 'visible' }}>

        {/* ── Page header ── */}
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">My Orders</h2>
            <p className="dash-page-sub">Track and manage all your delivery requests</p>
          </div>
          <Link to="/dashboard/orders/new" className="btn-primary btn-glow" style={{ fontSize: '0.875rem', padding: '0.75rem 1.5rem', borderRadius: 12, textDecoration: 'none' }}>
            <Package size={16} /> New Order
          </Link>
        </div>

        {/* ── STICKY FILTER + SEARCH BAR ── */}
        <div className="orders-sticky-bar">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
              <Search size={15} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,240,255,0.3)' }} />
              <input
                className="dash-input"
                placeholder="Search by order number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.375rem', borderRadius: 999, height: 40, fontSize: '0.85rem' }}
              />
            </div>
            {/* Filter chips */}
            <div className="filter-chips">
              {['All', 'Active', 'Completed', 'Cancelled'].map(f => (
                <button
                  key={f}
                  className={`filter-chip${filter === f ? ' active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                  {f === 'Active' && activeCount > 0 && (
                    <span style={{ padding: '0 5px', background: filter === 'Active' ? 'rgba(0,212,255,0.2)' : 'rgba(255,255,255,0.1)', borderRadius: 10, fontSize: '0.65rem', color: filter === 'Active' ? '#6366f1' : 'rgba(240,240,255,0.5)' }}>
                      {activeCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 20 }}>
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead><tr><th>Order #</th><th>Status</th><th>Payment</th><th>Pickup</th><th>Drop</th><th>Date</th><th>Actions</th></tr></thead>
                <tbody><SkeletonRow cols={6} /><SkeletonRow cols={6} /><SkeletonRow cols={6} /></tbody>
              </table>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card" style={{ borderRadius: 20 }}>
            <div className="dash-empty">
              <svg className="empty-state-svg" width="110" height="90" viewBox="0 0 110 90" fill="none" style={{ marginBottom: '1rem' }}>
                <rect x="20" y="28" width="70" height="52" rx="6" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
                <line x1="55" y1="28" x2="55" y2="80" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/>
                <path d="M20 28 L32 16 L78 16 L90 28" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
                {search || filter !== 'All'
                  ? <><line x1="38" y1="50" x2="72" y2="50" stroke="rgba(248,113,113,0.3)" strokeWidth="2"/><line x1="38" y1="60" x2="72" y2="60" stroke="rgba(248,113,113,0.15)" strokeWidth="2"/></>
                  : <><line x1="35" y1="48" x2="75" y2="48" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/><line x1="35" y1="58" x2="65" y2="58" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5"/></>
                }
              </svg>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'rgba(240,240,255,0.5)', marginBottom: '0.4rem' }}>
                {search || filter !== 'All' ? 'No matching orders found' : 'Your first delivery is just a tap away'}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.28)', maxWidth: 260, textAlign: 'center', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {search ? `No results for "${search}"` : filter !== 'All' ? 'Try a different filter' : 'Place an order and track it live from pickup to your door'}
              </p>
              {!search && filter === 'All' ? (
                <Link to="/dashboard/orders/new" className="btn-primary" style={{ padding: '0.6rem 1.25rem', textDecoration: 'none' }}>
                  <Package size={15} /> Place Order
                </Link>
              ) : (
                <button onClick={() => { setSearch(''); setFilter('All') }} className="btn-ghost">
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop: rich table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 20, display: 'none' }} id="orders-table-desktop">
              <div className="dash-table-wrapper">
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Order #</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Pickup</th>
                      <th>Drop</th>
                      <th>Agent</th>
                      <th>Date</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((o, idx) => {
                      const id = o.id || o._id
                      return (
                        <tr key={id} style={{ animation: `staggerUp 0.3s ${idx * 0.05}s both` }}>
                          <td data-label="Order #"><span className="dash-order-num">{o.orderNumber}</span></td>
                          <td data-label="Status"><StatusBadge status={o.status} /></td>
                          <td data-label="Payment"><PaymentChip o={o} /></td>
                          <td data-label="Pickup" className="dash-address" title={o.pickupAddress}>{o.pickupAddress || 'N/A'}</td>
                          <td data-label="Drop" className="dash-address" title={o.dropAddress}>{o.dropAddress || 'N/A'}</td>
                          <td data-label="Agent" style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.8rem' }}>
                            {o.assignedAgentId?.name || <span style={{ color: 'rgba(240,240,255,0.2)' }}>Pending</span>}
                          </td>
                          <td data-label="Date" style={{ color: 'rgba(240,240,255,0.4)', fontSize: '0.8rem' }}>
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                          <td data-label="Action">
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                              <Link to={`/dashboard/track?id=${id}`} className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 8, textDecoration: 'none' }}>
                                <MapPin size={13} /> Track
                              </Link>
                              {!['Delivered', 'Cancelled'].includes(o.status) && (
                                confirmCancelId === id ? (
                                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                                    <button onClick={() => handleCancel(id)} disabled={cancellingId === id} style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>
                                      {cancellingId === id ? '...' : 'Confirm'}
                                    </button>
                                    <button onClick={() => setConfirmCancelId(null)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(240,240,255,0.4)', cursor: 'pointer' }}>
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <button onClick={() => setConfirmCancelId(id)} className="btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 8, color: '#ef4444', borderColor: 'transparent' }}>
                                    <XCircle size={13} /> Cancel
                                  </button>
                                )
                              )}
                              {o.status === 'Delivered' && !o.rating && (
                                <button onClick={() => setRatingOrder(id)} className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 8, background: '#fbbf24', color: '#000' }}>
                                  <Star size={13} /> Rate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card list — shown on all sizes (table hidden on mobile via CSS) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filtered.map((o, idx) => {
                const id = o.id || o._id
                const isDone = ['Delivered', 'Cancelled'].includes(o.status)
                return (
                  <div key={id} className="order-list-card" style={{ animation: `staggerUp 0.3s ${idx * 0.04}s both` }}>
                    {/* PRIMARY — order# + status */}
                    <div className="order-list-card-primary">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                        <span className="dash-order-num" style={{ fontSize: '0.82rem', flexShrink: 0 }}>{o.orderNumber}</span>
                        <PaymentChip o={o} />
                      </div>
                      <StatusBadge status={o.status} />
                    </div>

                    {/* SECONDARY — route */}
                    <div className="order-list-card-secondary">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'rgba(240,240,255,0.65)' }}>
                        <MapPin size={11} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.pickupAddress || 'Pickup location'}</span>
                        <ChevronRight size={11} style={{ flexShrink: 0, color: 'rgba(240,240,255,0.2)' }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#10b981' }}>{o.dropAddress || 'Drop location'}</span>
                      </div>
                    </div>

                    {/* TERTIARY — date + agent + actions */}
                    <div className="order-list-card-tertiary">
                      <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.35)' }}>
                          {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                        {o.assignedAgentId?.name && (
                          <span style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.35)' }}>
                            via {o.assignedAgentId.name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {!isDone && (
                          confirmCancelId === id ? (
                            <>
                              <button onClick={() => handleCancel(id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>
                                {cancellingId === id ? '…' : 'Cancel Order?'}
                              </button>
                              <button onClick={() => setConfirmCancelId(null)} style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>No</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmCancelId(id)} style={{ fontSize: '0.75rem', color: 'rgba(248,113,113,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem' }}>
                              <XCircle size={13} />
                            </button>
                          )
                        )}
                        {o.status === 'Delivered' && !o.rating && (
                          <button onClick={() => setRatingOrder(id)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 8, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Star size={12} /> Rate
                          </button>
                        )}
                        <Link
                          to={`/dashboard/track?id=${id}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.8rem', color: isDone ? 'rgba(0,212,255,0.35)' : '#6366f1', textDecoration: 'none', fontWeight: 600 }}
                        >
                          <MapPin size={13} /> Track
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <RatingModal
        isOpen={!!ratingOrder}
        onClose={() => setRatingOrder(null)}
        orderId={ratingOrder}
        onSubmit={handleRateSubmit}
      />
    </DashboardLayout>
  )
}
