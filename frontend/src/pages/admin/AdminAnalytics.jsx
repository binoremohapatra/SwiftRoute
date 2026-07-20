import { useState, useEffect } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Calendar, DollarSign, Package, TrendingUp, Clock, Users, Download } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { adminAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import AnimatedCounter from '../../components/ui/AnimatedCounter'

const COLORS = ['#00d4ff', '#34d399', '#fbbf24', '#f87171', '#8b5cf6']

export default function AdminAnalytics() {
  const { token } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('7d') // 7d, 30d, 90d, custom
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      let url = `http://localhost:5000/api/v1/admin/analytics?period=${period}`
      if (period === 'custom' && customStart && customEnd) {
        url += `&customStart=${customStart}&customEnd=${customEnd}`
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setData(json.data)
      } else {
        toast.error('Failed to load analytics')
      }
    } catch {
      toast.error('Network error')
    }
    setLoading(false)
  }

  const exportPDF = () => {
    window.print() // Simplest native PDF export
  }

  return (
    <DashboardLayout role="admin" title="Advanced Analytics">
      <div className="dash-container">
        
        {/* Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {['7d', '30d', '90d', 'custom'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={period === p ? 'btn-primary' : 'btn-ghost'}
                style={{ padding: '0.5rem 1rem', textTransform: 'uppercase', borderRadius: 12, fontSize: '0.85rem' }}
              >
                {p}
              </button>
            ))}
            {period === 'custom' && (
              <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={(e) => setCustomStart(e.target.value)} 
                  className="dash-input" 
                  style={{ padding: '0.4rem' }} 
                />
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={(e) => setCustomEnd(e.target.value)} 
                  className="dash-input" 
                  style={{ padding: '0.4rem' }} 
                />
                <button onClick={fetchAnalytics} className="btn-primary" style={{ padding: '0.4rem 1rem' }}>Apply</button>
              </div>
            )}
          </div>
          <button onClick={exportPDF} className="btn-ghost" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
            <Download size={16} /> Export PDF
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <div className="loader"></div>
          </div>
        ) : data ? (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <KPICard title="Total Orders" value={data.totalOrders} icon={Package} color="#00d4ff" delay={0.1} trend={data.trends?.orders} />
              <KPICard title="Total Revenue" value={`₹${data.totalRevenue?.toLocaleString() || 0}`} icon={DollarSign} color="#34d399" delay={0.2} trend={data.trends?.revenue} />
              <KPICard title="Avg Delivery" value={`${data.avgDeliveryDurationMins}m`} icon={Clock} color="#fbbf24" delay={0.3} trend={data.trends?.avgDelivery} reverseTrendColor />
              <KPICard title="Failed / Cancelled" value={data.failedDeliveries} icon={TrendingUp} color="#f87171" delay={0.4} trend={data.trends?.failed} reverseTrendColor />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* 1. Orders Over Time */}
              <ChartCard title="Orders Over Time" delay={0.5}>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.charts.ordersOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'rgba(20,20,30,0.9)', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Line type="monotone" dataKey="orders" stroke="#00d4ff" strokeWidth={3} dot={{ r: 4, fill: '#00d4ff' }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 2. Revenue Trend */}
              <ChartCard title="Revenue Trend (₹)" delay={0.6}>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.charts.ordersOverTime}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.5}/>
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <Tooltip contentStyle={{ background: 'rgba(20,20,30,0.9)', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#34d399" fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              {/* 3. Status Distribution */}
              <ChartCard title="Status Distribution" delay={0.7}>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={data.charts.statusDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {data.charts.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(20,20,30,0.9)', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 5. Delivery Time Heatmap */}
              <ChartCard title="Delivery Time Heatmap" delay={0.8}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.charts.heatmap}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="hour" stroke="rgba(255,255,255,0.4)" fontSize={10} interval={3} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'rgba(20,20,30,0.9)', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="orders" fill="#fbbf24" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {/* 4. Agent Performance (Top 10) */}
              <ChartCard title="Agent Performance (Top 5)" delay={0.9}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.agentLeaderboard.slice(0, 5)} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={true} vertical={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="rgba(255,255,255,0.8)" fontSize={12} width={100} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'rgba(20,20,30,0.9)', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="totalDeliveries" fill="#8b5cf6" radius={[0,4,4,0]} name="Completed Deliveries" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* 6. On-Time vs Delayed */}
              <ChartCard title="On-time vs Delayed" delay={1.0}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.charts.onTimeVsDelayed}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'rgba(20,20,30,0.9)', border: 'none', borderRadius: 8, color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="onTime" stackId="a" fill="#34d399" radius={[0,0,4,4]} name="On Time" />
                    <Bar dataKey="delayed" stackId="a" fill="#f87171" radius={[4,4,0,0]} name="Delayed" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '2rem' }}>No data available</div>
        )}
      </div>

      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .admin-sidebar, .admin-header, button { display: none !important; }
          .glass-card { background: white !important; border: 1px solid #ccc !important; box-shadow: none !important; color: black !important; }
          .recharts-text { fill: black !important; }
        }
      `}</style>
    </DashboardLayout>
  )
}

function KPICard({ title, value, icon: Icon, color, delay, trend, reverseTrendColor }) {
  const isPositive = trend > 0;
  const isZero = trend === 0;
  
  // For some metrics like delivery time and failures, less is better (reverse color logic)
  const positiveColor = reverseTrendColor ? '#f87171' : '#34d399';
  const negativeColor = reverseTrendColor ? '#34d399' : '#f87171';
  const trendColor = isZero ? 'rgba(255,255,255,0.4)' : isPositive ? positiveColor : negativeColor;

  return (
    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 16, animation: `staggerUp 0.5s ${delay}s both`, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <div style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.5)', fontWeight: 600 }}>{title}</div>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
        {typeof value === 'number' ? <AnimatedCounter value={value} /> : value}
      </div>
      {trend !== undefined && (
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', fontSize: '0.75rem', fontWeight: 700, color: trendColor, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {isPositive ? '↑' : isZero ? '-' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

function ChartCard({ title, children, delay }) {
  return (
    <div className="glass-card" style={{ padding: '1.5rem', borderRadius: 20, animation: `staggerUp 0.5s ${delay}s both` }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>{title}</h3>
      {children}
    </div>
  )
}
