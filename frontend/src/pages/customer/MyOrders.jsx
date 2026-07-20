import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Package, Search, MapPin, XCircle, Star, Filter, CheckCircle } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
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

  useEffect(() => {
    orderAPI.getAll(token).then((res) => {
      if (res.statusCode === 200) setOrders(res.data.data || [])
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load orders', 'Please check your connection.')
      setLoading(false)
    })
  }, [token, toast])

  const handleCancel = async (id, e) => {
    e.preventDefault()
    if (!window.confirm('Are you sure you want to cancel this order?')) return
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
        toast.success('Rating submitted successfully')
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
      if (filter === 'Active') return !['Delivered', 'Cancelled'].includes(o.status)
      if (filter === 'Completed') return o.status === 'Delivered'
      if (filter === 'Cancelled') return o.status === 'Cancelled'
      return true
    })
  }, [orders, search, filter])

  return (
    <DashboardLayout>
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">My Orders</h2>
            <p className="dash-page-sub">Track and manage all your delivery requests</p>
          </div>
          <Link to="/dashboard/orders/new" className="btn-primary btn-glow" style={{ fontSize: '0.875rem', padding: '0.75rem 1.5rem', borderRadius: 12, textDecoration: 'none' }}>
            <Package size={16} /> New Order
          </Link>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 320 }}>
            <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(245,245,247,0.3)' }} />
            <input
              className="dash-input"
              placeholder="Search by order number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', borderRadius: 999 }}
            />
          </div>

          <div className="filter-chips">
            <Filter size={14} style={{ color: 'rgba(245,245,247,0.3)', marginRight: 4 }} />
            {['All', 'Active', 'Completed', 'Cancelled'].map(f => (
              <button
                key={f}
                className={`filter-chip${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f}
                {f === 'Active' && <span style={{ padding: '0 4px', background: 'rgba(255,255,255,0.1)', borderRadius: 10, fontSize: '0.65rem' }}>
                  {orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status)).length}
                </span>}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '0', overflow: 'hidden', borderRadius: 20 }}>
          {loading ? (
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Pickup</th>
                    <th>Drop</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                </tbody>
              </table>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="orders"
              title={search || filter !== 'All' ? 'No matching orders found' : 'No orders yet'}
              subtitle={search ? `No results for "${search}"` : 'Place your first order and track it in real time.'}
              action={!search && filter === 'All' ? (
                <Link to="/dashboard/orders/new" className="btn-primary" style={{ padding: '0.6rem 1.25rem', textDecoration: 'none' }}>
                  <Package size={15} /> Place Order
                </Link>
              ) : (
                <button onClick={() => { setSearch(''); setFilter('All') }} className="btn-ghost">
                  Clear Filters
                </button>
              )}
            />
          ) : (
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
                      <td><span className="dash-order-num">{o.orderNumber}</span></td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td>
                        {o.paymentStatus === 'PAID' ? (
                           <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(52,211,153,0.1)', color: '#34d399', display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle size={10} /> PAID</span>
                        ) : o.paymentMethod === 'COD' ? (
                           <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>COD PENDING</span>
                        ) : (
                           <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>FAILED</span>
                        )}
                      </td>
                      <td className="dash-address" title={o.pickupAddress}>
                        {o.pickupAddress || 'N/A'}
                      </td>
                      <td className="dash-address" title={o.dropAddress}>
                        {o.dropAddress || 'N/A'}
                      </td>
                      <td style={{ color: 'rgba(245,245,247,0.5)', fontSize: '0.8rem' }}>
                        {o.assignedAgentId?.name || <span style={{ color: 'rgba(245,245,247,0.2)' }}>Pending</span>}
                      </td>
                      <td style={{ color: 'rgba(245,245,247,0.4)', fontSize: '0.8rem' }}>
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Link
                            to={`/dashboard/track?id=${id}`}
                            className="btn-ghost"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 8, textDecoration: 'none' }}
                          >
                            <MapPin size={13} /> Track
                          </Link>
                          {!['Delivered', 'Cancelled'].includes(o.status) && (
                            <button
                              onClick={(e) => handleCancel(id, e)}
                              disabled={cancellingId === id}
                              className="btn-ghost"
                              style={{ 
                                padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 8,
                                color: '#f87171', borderColor: 'transparent',
                                opacity: cancellingId === id ? 0.5 : 1
                              }}
                            >
                              {cancellingId === id ? 'Cancelling...' : <><XCircle size={13} /> Cancel</>}
                            </button>
                          )}
                          {o.status === 'Delivered' && !o.rating && (
                            <button
                              onClick={() => setRatingOrder(id)}
                              className="btn-primary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 8, background: '#fbbf24', color: '#000' }}
                            >
                              <Star size={13} /> Rate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
