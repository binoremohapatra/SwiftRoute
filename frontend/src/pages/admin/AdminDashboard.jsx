import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, CheckCircle, Clock, Users, Bike, Map, Activity, Bell, Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardLayout from '../../components/DashboardLayout'
import StatCard from '../../components/ui/StatCard'
import { SkeletonCard } from '../../components/ui/SkeletonLoader'
import { useToast } from '../../components/ui/Toast'
import { adminAPI, fcmAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { token } = useAuth()
  const navigate  = useNavigate()
  const toast     = useToast()

  const [stats,   setStats]   = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [period,  setPeriod]  = useState('daily')
  const [loading, setLoading] = useState(true)
  const [showPushModal, setShowPushModal] = useState(false)
  const [pushData, setPushData] = useState({ title: '', body: '', broadcast: true })
  const [pushing, setPushing] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [s, a] = await Promise.all([
        adminAPI.getDashboardStats(token),
        adminAPI.getAnalytics(token, period),
      ])
      if (s.success) setStats(s.data)
      if (a.success) setAnalytics(a.data)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [period, token, toast])

  const chartData = analytics?.charts?.ordersOverTime || []

  const handleExportOrders = async () => {
    try {
      const res  = await adminAPI.exportOrdersCSV(token)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Export Successful', 'Orders exported to CSV')
    } catch { toast.error('Export Failed', 'Could not export orders') }
  }

  const handleExportAgents = async () => {
    try {
      const res  = await adminAPI.exportAgentsCSV(token)
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a'); a.href = url; a.download = 'agents.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Export Successful', 'Agents exported to CSV')
    } catch { toast.error('Export Failed', 'Could not export agents') }
  }

  const handleSendPush = async (e) => {
    e.preventDefault()
    setPushing(true)
    try {
      const res = await fcmAPI.sendManualPush(pushData, token)
      if (res.success) {
        toast.success('Notification Sent', res.message)
        setShowPushModal(false)
        setPushData({ title: '', body: '', broadcast: true })
      } else {
        toast.error('Failed to send notification', res.message)
      }
    } catch { toast.error('Error sending notification') }
    finally  { setPushing(false) }
  }

  return (
    <DashboardLayout role="admin">
      <div className="dash-page">

        {/* ── Page header ── */}
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">Operations Overview</h2>
            <p className="dash-page-sub">System-wide fleet analytics and live metrics</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => setShowPushModal(true)} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
              <Bell size={14} /> Broadcast Alert
            </button>
            <button onClick={() => navigate('/admin/tracking')} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
              <Map size={14} /> Live Fleet Map
            </button>
          </div>
        </div>

        {loading ? (
          /* Skeleton bento grid */
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              <SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} /><SkeletonCard lines={2} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '65fr 35fr', gap: '1.25rem' }}>
              <SkeletonCard lines={6} />
              <SkeletonCard lines={4} />
            </div>
          </div>
        ) : (
          <>
            {/* ═══ BENTO: Primary KPI row ═══
                Active orders gets its own hero block — widest, most important.
                The others are slimmer secondary cards.                         */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Hero KPI — Active Orders */}
              <div className="glass-card" style={{ padding: '1.5rem 1.75rem', borderRadius: 20, borderLeft: '3px solid #6366f1', display: 'flex', flexDirection: 'column', gap: '0.5rem', gridRow: 'span 1' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(240,240,255,0.35)' }}>Active Orders</span>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={18} color="#6366f1" />
                  </div>
                </div>
                <div style={{ fontSize: '2.75rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {stats?.activeOrders ?? 0}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(240,240,255,0.4)' }}>orders in motion right now</div>
              </div>

              {/* Secondary KPIs */}
              <StatCard label="Delivered Today" value={stats?.deliveredToday}        icon={CheckCircle} />
              <StatCard label="Pending"          value={stats?.pendingOrders}         icon={Clock}       color="#fbbf24" />
              <StatCard label="Online Agents"    value={stats?.onlineAgents}          icon={Activity}    />
              <StatCard label="Success Rate"     value={stats?.deliverySuccessRate}   suffix="%" icon={Activity} />
            </div>

            {/* Secondary KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: 'var(--space-section)' }}>
              <StatCard label="Total Agents"      value={stats?.totalAgents}           icon={Bike}  />
              <StatCard label="Total Users"        value={stats?.totalUsers}            icon={Users} />
              <StatCard label="Avg Delivery Time"  value={stats?.avgDeliveryTimeMinutes} suffix=" min" icon={Clock} />
            </div>

            {/* ═══ BENTO: 65 / 35 main content ═══ */}
            <div className="bento-grid" style={{ gridTemplateColumns: '65fr 35fr' }}>

              {/* LEFT — Analytics chart */}
              <div className="bento-col-main">
                <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Order Trends</h2>
                      <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(240,240,255,0.35)' }}>
                        {chartData.length} data points — {period}
                      </p>
                    </div>
                    <div className="filter-chips">
                      {['daily', 'weekly', 'monthly'].map(p => (
                        <button
                          key={p}
                          onClick={() => setPeriod(p)}
                          className={`filter-chip${period === p ? ' active' : ''}`}
                          style={{ textTransform: 'capitalize', padding: '0.3rem 0.75rem', fontSize: '0.77rem' }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: 'rgba(240,240,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                      <YAxis tick={{ fill: 'rgba(240,240,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#0a0a12', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#6366f1', fontWeight: 600 }}
                        labelStyle={{ color: 'rgba(240,240,255,0.7)', marginBottom: 4 }}
                        cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                      />
                      <Bar dataKey="orders" fill="url(#colorUv)" radius={[6,6,0,0]} barSize={36} />
                      <defs>
                        <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.85}/>
                          <stop offset="95%" stopColor="#0077ff" stopOpacity={0.85}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Export row — slim, low visual weight */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(240,240,255,0.35)', marginRight: 'auto' }}>EXPORT DATA</span>
                  <button onClick={handleExportOrders} className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem', borderRadius: 8, gap: 5 }}>
                    <Download size={13} /> Orders CSV
                  </button>
                  <button onClick={handleExportAgents} className="btn-ghost" style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem', borderRadius: 8, gap: 5 }}>
                    <Download size={13} /> Agents CSV
                  </button>
                </div>
              </div>

              {/* RIGHT — Agent leaderboard */}
              <div className="bento-col-side">
                {analytics?.agentLeaderboard?.length > 0 ? (
                  <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 24 }}>
                    <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Top Agents</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {analytics.agentLeaderboard.map((a, i) => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem', borderRadius: 14, background: i < 3 ? 'rgba(255,255,255,0.025)' : 'transparent', border: `1px solid ${i < 3 ? 'rgba(255,255,255,0.05)' : 'transparent'}` }}>
                          <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : i === 1 ? 'linear-gradient(135deg,#94a3b8,#64748b)' : i === 2 ? 'linear-gradient(135deg,#b45309,#78350f)' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: i < 3 ? '#000' : '#fff', flexShrink: 0 }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(240,240,255,0.35)' }}>{a.vehicleType} · {a.deliveriesInPeriod} deliveries</div>
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fbbf24', flexShrink: 0 }}>
                            {a.rating}★
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="glass-card" style={{ padding: '1.75rem', borderRadius: 24 }}>
                    <div className="dash-empty" style={{ padding: '2rem 1rem' }}>
                      <svg className="empty-state-svg" width="80" height="70" viewBox="0 0 80 70" fill="none" style={{ marginBottom: '0.875rem' }}>
                        <circle cx="40" cy="28" r="18" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
                        <circle cx="40" cy="28" r="9" fill="rgba(251,191,36,0.08)" stroke="rgba(251,191,36,0.2)" strokeWidth="1.5"/>
                        <line x1="10" y1="60" x2="70" y2="60" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="round"/>
                        <line x1="22" y1="60" x2="22" y2="46" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
                        <line x1="40" y1="60" x2="40" y2="38" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
                        <line x1="58" y1="60" x2="58" y2="50" stroke="rgba(255,255,255,0.08)" strokeWidth="2"/>
                      </svg>
                      <div style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.3)', textAlign: 'center' }}>
                        Agent performance data will appear here after the first completed deliveries
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Push Notification Modal */}
        {showPushModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s' }}>
            <div className="glass-card" style={{ padding: '2.5rem', width: '100%', maxWidth: 450, borderRadius: 24, animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={20} color="#6366f1" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Broadcast Alert</h2>
              </div>
              <form onSubmit={handleSendPush} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(240,240,255,0.5)', marginBottom: '0.5rem' }}>Notification Title</label>
                  <input required className="dash-input" placeholder="e.g. System Maintenance at 2 AM" value={pushData.title} onChange={e => setPushData({...pushData, title: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(240,240,255,0.5)', marginBottom: '0.5rem' }}>Message</label>
                  <textarea required className="dash-input" placeholder="Type your message here…" value={pushData.body} onChange={e => setPushData({...pushData, body: e.target.value})} style={{ minHeight: 100, resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn-ghost" style={{ flex: 1, padding: '0.875rem' }} onClick={() => setShowPushModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary btn-glow" style={{ flex: 1, padding: '0.875rem' }} disabled={pushing}>
                    {pushing ? <span className="dash-loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Send Alert'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
