import { useState, useEffect } from 'react'
import { Search, Download, Filter, ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonRow } from '../../components/ui/SkeletonLoader'
import { useToast } from '../../components/ui/Toast'
import { adminAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminOrders() {
  const { token } = useAuth()
  const toast = useToast()
  
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 })
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchOrders = async (page = 1) => {
    setLoading(true)
    try {
      const params = { page, limit: 10 }
      if (search) params.search = search
      if (status) params.status = status
      if (paymentStatus) params.paymentStatus = paymentStatus
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate

      const res = await adminAPI.getOrders(token, params)
      if (res.success) {
        setOrders(res.data.data)
        setPagination(res.data.pagination)
      }
    } catch (e) { 
      toast.error('Failed to load orders')
    } finally { 
      setLoading(false) 
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchOrders(1) }, [status, paymentStatus, startDate, endDate])

  const handleSearch = (e) => { 
    e.preventDefault(); 
    fetchOrders(1) 
  }

  const handleExport = async () => {
    try {
      const params = {}
      if (status) params.status = status
      if (paymentStatus) params.paymentStatus = paymentStatus
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res = await adminAPI.exportOrdersCSV(token, params)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Export Successful', 'Orders exported to CSV')
    } catch {
      toast.error('Export Failed', 'Could not export orders')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setPaymentStatus('')
    setStartDate('')
    setEndDate('')
    // useEffect will trigger fetch when status/dates change
  }

  const isFiltered = search || status || paymentStatus || startDate || endDate

  return (
    <DashboardLayout role="admin">
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">Order Management</h2>
            <p className="dash-page-sub">Monitor and search through all system orders</p>
          </div>
          <button onClick={handleExport} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>

        {/* Filter Bar */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: 20, marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,240,255,0.3)' }} />
              <input 
                className="dash-input"
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Search order #, customer..."
                style={{ paddingLeft: '2.5rem', width: '100%' }} 
              />
            </div>
            
            <select 
              className="dash-input"
              value={status} 
              onChange={e => setStatus(e.target.value)}
              style={{ flex: '1 1 120px', width: 'auto' }}
            >
              <option value="">Order Status</option>
              {['Placed', 'Assigned', 'Picked-up', 'In-Transit', 'Delivered', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select 
              className="dash-input"
              value={paymentStatus} 
              onChange={e => setPaymentStatus(e.target.value)}
              style={{ flex: '1 1 120px', width: 'auto' }}
            >
              <option value="">Payment Status</option>
              {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 240px' }}>
              <input 
                type="date" 
                className="dash-input"
                value={startDate} 
                onChange={e => setStartDate(e.target.value)}
                style={{ flex: 1 }} 
              />
              <span style={{ color: 'rgba(240,240,255,0.3)' }}>to</span>
              <input 
                type="date" 
                className="dash-input"
                value={endDate} 
                onChange={e => setEndDate(e.target.value)}
                style={{ flex: 1 }} 
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.25rem', borderRadius: 10 }}>
              Search
            </button>
            {isFiltered && (
              <button type="button" onClick={clearFilters} className="btn-ghost" style={{ padding: '0.65rem 1rem', borderRadius: 10, color: '#f87171' }}>
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Orders Table */}
        <div className="glass-card stagger-list" style={{ padding: 0, overflow: 'hidden', borderRadius: 24 }}>
          {loading ? (
            <div className="dash-table-wrapper" style={{ minHeight: 300 }}>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Order #</th><th>Customer</th><th>Agent</th><th>Status</th><th>Payment</th><th>Route</th><th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                  <SkeletonRow cols={7} />
                </tbody>
              </table>
            </div>
          ) : orders.length === 0 ? (
            <div style={{ padding: '4rem 0' }}>
              <EmptyState 
                icon="orders" 
                title="No orders found" 
                subtitle={isFiltered ? "Try adjusting your filters or search terms." : "There are no orders in the system yet."} 
                action={isFiltered ? <button className="btn-ghost" onClick={clearFilters}>Clear Filters</button> : null}
              />
            </div>
          ) : (
            <div className="dash-table-wrapper">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Agent</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Route</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, idx) => (
                    <tr key={o.id} style={{ animation: `staggerUp 0.3s ${idx * 0.05}s both` }}>
                      <td>
                        <span className="dash-order-num">{o.orderNumber}</span>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{o.customer?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)', marginTop: 2 }}>{o.customer?.phone}</div>
                      </td>
                      <td>
                        {o.fulfillmentType === '3PL' ? (
                          <>
                            <div style={{ color: '#f59e0b', fontWeight: 600 }}>{o.thirdPartyCourier || '3PL'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)', marginTop: 2 }}>{o.thirdPartyTrackingId}</div>
                          </>
                        ) : o.assignedAgent ? (
                          <>
                            <div style={{ color: 'rgba(240,240,255,0.8)', fontWeight: 500 }}>{o.assignedAgent.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)', marginTop: 2 }}>{o.assignedAgent.vehicleType}</div>
                          </>
                        ) : (
                          <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: 6, fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)' }}>Unassigned</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={o.status} />
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                          background: o.paymentStatus === 'PAID' ? 'rgba(52,211,153,0.1)' : o.paymentStatus === 'FAILED' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                          color: o.paymentStatus === 'PAID' ? '#34d399' : o.paymentStatus === 'FAILED' ? '#f87171' : '#fbbf24'
                        }}>
                          {o.paymentStatus} {o.paymentMethod === 'COD' ? '💵' : '💳'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div className="dash-address" style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={o.pickupAddress}>
                            <MapPin size={10} color="#a78bfa" style={{ flexShrink: 0 }} /> {o.pickupAddress}
                          </div>
                          <div className="dash-address" style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={o.dropAddress}>
                            <MapPin size={10} color="#34d399" style={{ flexShrink: 0 }} /> {o.dropAddress}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.6)' }}>
                          {new Date(o.createdAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(240,240,255,0.3)', marginTop: 2 }}>
                          {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
              <span style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.85rem' }}>
                Showing <strong style={{ color: 'var(--text-primary)' }}>{orders.length}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{pagination.total}</strong> orders
              </span>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={() => fetchOrders(pagination.page - 1)} 
                  disabled={pagination.page === 1}
                  className="btn-ghost"
                  style={{ padding: '0.4rem 0.8rem', borderRadius: 8, opacity: pagination.page === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
                  {pagination.page} / {pagination.totalPages}
                </div>
                <button 
                  onClick={() => fetchOrders(pagination.page + 1)} 
                  disabled={pagination.page === pagination.totalPages}
                  className="btn-ghost"
                  style={{ padding: '0.4rem 0.8rem', borderRadius: 8, opacity: pagination.page === pagination.totalPages ? 0.4 : 1 }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
