import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, CheckCircle, Clock, Users, Bike, Map, Activity, Bell, Download, MapPin } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DashboardLayout from '../../components/DashboardLayout'
import StatCard from '../../components/ui/StatCard'
import { SkeletonCard, SkeletonRow } from '../../components/ui/SkeletonLoader'
import { useToast } from '../../components/ui/Toast'
import { adminAPI, fcmAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'

export default function AdminDashboard() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  
  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [period, setPeriod] = useState('daily')
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
    } catch (e) {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [period, token, toast])

  const chartData = analytics?.charts?.ordersOverTime || []

  const handleExportOrders = async () => {
    try {
      const res = await adminAPI.exportOrdersCSV(token)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Export Successful', 'Orders exported to CSV')
    } catch {
      toast.error('Export Failed', 'Could not export orders')
    }
  }

  const handleExportAgents = async () => {
    try {
      const res = await adminAPI.exportAgentsCSV(token)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'agents.csv'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Export Successful', 'Agents exported to CSV')
    } catch {
      toast.error('Export Failed', 'Could not export agents')
    }
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
    } catch (err) {
      toast.error('Error sending notification')
    } finally {
      setPushing(false)
    }
  }

  return (
    <DashboardLayout role="admin">
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">Admin Dashboard</h2>
            <p className="dash-page-sub">System-wide overview and analytics</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={() => setShowPushModal(true)} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
              <Bell size={14} /> Send Alert
            </button>
            <button onClick={() => navigate('/admin/tracking')} className="btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
              <Map size={14} /> Live Fleet Map
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="glass-card" style={{ padding: '1rem 1.5rem', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Data Export</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleExportOrders} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: 6, borderRadius: 8 }}>
              <Download size={14} /> Export Orders
            </button>
            <button onClick={handleExportAgents} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', gap: 6, borderRadius: 8 }}>
              <Download size={14} /> Export Agents
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        ) : (
          <>
            {/* KPI Grid */}
            <div className="dash-stats-grid stagger-list" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', marginBottom: '1.5rem' }}>
              <StatCard label="Active Orders"     value={stats?.activeOrders}          icon={Package}      color="#6366f1" />
              <StatCard label="Delivered Today"   value={stats?.deliveredToday}        icon={CheckCircle}  color="#34d399" />
              <StatCard label="Pending Orders"    value={stats?.pendingOrders}         icon={Clock}        color="#fbbf24" />
              <StatCard label="Online Agents"     value={stats?.onlineAgents}          icon={Activity}     color="#34d399" />
              <StatCard label="Total Agents"      value={stats?.totalAgents}           icon={Bike}         color="#818cf8" />
              <StatCard label="Total Users"       value={stats?.totalUsers}            icon={Users}        color="#60a5fa" />
              <StatCard label="Avg Delivery Time" value={stats?.avgDeliveryTimeMinutes} suffix="m" icon={Clock} color="#fbbf24" />
              <StatCard label="Success Rate"      value={stats?.deliverySuccessRate}    suffix="%" icon={Activity} color="#34d399" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
              
              {/* Analytics Chart */}
              <div className="glass-card stagger-list" style={{ padding: '1.75rem', borderRadius: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Order Trends</h2>
                  <div className="filter-chips">
                    {['daily', 'weekly', 'monthly'].map(p => (
                      <button 
                        key={p} 
                        onClick={() => setPeriod(p)}
                        className={`filter-chip${period === p ? ' active' : ''}`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'rgba(245,245,247,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: 'rgba(245,245,247,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#0a0a12', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }} 
                      itemStyle={{ color: '#6366f1', fontWeight: 600 }}
                      labelStyle={{ color: 'rgba(245,245,247,0.7)', marginBottom: 4 }} 
                      cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                    />
                    <Bar dataKey="orders" fill="url(#colorUv)" radius={[6, 6, 0, 0]} barSize={40} />
                    <defs>
                      <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.8}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Agent Leaderboard */}
              {analytics?.agentLeaderboard?.length > 0 && (
                <div className="glass-card stagger-list" style={{ padding: '1.75rem', borderRadius: 24 }}>
                  <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Top Agents</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {analytics.agentLeaderboard.map((a, i) => (
                      <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: 16, background: i < 3 ? 'rgba(255,255,255,0.03)' : 'transparent', border: i < 3 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : i === 1 ? 'linear-gradient(135deg, #94a3b8, #64748b)' : i === 2 ? 'linear-gradient(135deg, #b45309, #78350f)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: i < 3 ? '#000' : '#fff' }}>
                          {i + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{a.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(245,245,247,0.4)' }}>{a.vehicleType} • {a.deliveriesInPeriod} deliveries</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24' }}>
                          {a.rating} ★
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(245,245,247,0.5)', marginBottom: '0.5rem' }}>Notification Title</label>
                  <input required className="dash-input" placeholder="e.g. System Maintenance" value={pushData.title} onChange={e => setPushData({...pushData, title: e.target.value})} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(245,245,247,0.5)', marginBottom: '0.5rem' }}>Message Content</label>
                  <textarea required className="dash-input" placeholder="Type your message here..." value={pushData.body} onChange={e => setPushData({...pushData, body: e.target.value})} style={{ minHeight: 120, resize: 'vertical' }} />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="button" className="btn-ghost" style={{ flex: 1, padding: '0.875rem' }} onClick={() => setShowPushModal(false)}>
                    Cancel
                  </button>
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
