import { useState, useEffect } from 'react'
import { Users, Truck, User, Search, Download } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/SkeletonLoader'
import { useAuth } from '../../context/AuthContext'
import { adminAPI } from '../../services/api'
import { useToast } from '../../components/ui/Toast'

export default function AdminUsers() {
  const { token } = useAuth()
  const toast = useToast()
  
  const [data, setData] = useState({ customers: [], agents: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('customers')
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([adminAPI.getUsers(token), adminAPI.getAgents(token)])
      .then(([usersRes, agentsRes]) => {
        setData({
          customers: usersRes.success ? usersRes.data.data : [],
          agents: agentsRes.success ? agentsRes.data.data : [],
        })
        setLoading(false)
      })
      .catch(() => {
        toast.error('Connection Error', 'Failed to load user data')
        setLoading(false)
      })
  }, [token, toast])

  const handleExport = async () => {
    try {
      const res = await adminAPI.exportAgentsCSV(token) // or a unified export depending on tab
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${tab}.csv`; a.click()
      URL.revokeObjectURL(url)
      toast.success('Export Successful', `Exported ${tab} to CSV`)
    } catch {
      toast.error('Export Failed', 'Could not export data')
    }
  }

  const list = tab === 'customers' ? data.customers : data.agents
  const filteredList = list.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  )

  return (
    <DashboardLayout role="admin">
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">Users & Agents</h2>
            <p className="dash-page-sub">Manage all platform participants</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-indigo)' }}>
              <User size={14} /> {data.customers.length} Customers
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: 'var(--bg-elevated)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              <Truck size={14} /> {data.agents.length} Agents
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          
          <div className="kanban-tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
            {['customers', 'agents'].map((t) => (
              <button 
                key={t} 
                className={`kanban-tab${tab === t ? ' active' : ''}`} 
                onClick={() => setTab(t)}
                style={{ 
                  padding: '0.5rem 1.25rem', textTransform: 'capitalize', borderBottom: 'none', 
                  background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent', 
                  borderRadius: 999, border: `1px solid ${tab === t ? 'rgba(255,255,255,0.1)' : 'transparent'}` 
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: 400 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(240,240,255,0.3)' }} />
              <input
                className="dash-input"
                placeholder={`Search ${tab}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.5rem', borderRadius: 999, width: '100%' }}
              />
            </div>
            <button onClick={handleExport} className="btn-ghost" style={{ padding: '0 1rem', borderRadius: 999 }}>
              <Download size={16} />
            </button>
          </div>

        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
            <SkeletonCard lines={3} />
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ marginTop: '2rem' }}>
            <EmptyState 
              icon="agent" 
              title={search ? `No ${tab} found matching "${search}"` : `No ${tab} found`}
              subtitle={search ? "Try using different search terms." : `There are no ${tab} registered yet.`}
              action={search ? <button className="btn-ghost" onClick={() => setSearch('')}>Clear Search</button> : null}
            />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '1.25rem' }}>
            {filteredList.map((u, idx) => {
              const isAgent = tab === 'agents'
              const color = isAgent ? '#8b5cf6' : '#6366f1'
              
              return (
                <div key={u.id} className="glass-card stagger-list" style={{ padding: '1.5rem', borderRadius: 24, animation: `staggerUp 0.3s ${idx * 0.05}s both`, borderTop: `4px solid ${color}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ 
                      width: 48, height: 48, borderRadius: 16, 
                      background: `${color}15`, 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '1.25rem', fontWeight: 800, color,
                      boxShadow: `0 8px 16px ${color}10`
                    }}>
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 2 }}>{u.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.5)' }}>{u.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Row label="Phone" value={u.phone} />
                    
                    {isAgent && (
                      <>
                        <Row label="Vehicle" value={u.vehicleType} />
                        <Row 
                          label="Status" 
                          value={
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: u.isAvailable ? '#10b981' : '#ef4444' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: u.isAvailable ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${u.isAvailable ? '#10b981' : '#ef4444'}` }} />
                              {u.isAvailable ? 'Available' : 'Offline'}
                            </span>
                          }
                        />
                        <Row label="Rating" value={<span style={{ color: '#fbbf24', fontWeight: 700 }}>{u.rating ? `${u.rating} ★` : 'N/A'}</span>} />
                        <Row label="Total Deliveries" value={u.totalDeliveries || 0} />
                      </>
                    )}
                    
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0.25rem 0' }} />
                    <Row label="Joined" value={new Date(u.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.8rem', color: 'rgba(240,240,255,0.4)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
        {value || '—'}
      </span>
    </div>
  )
}
