import { useState } from 'react'
import { User, Bike, Settings2, CheckCircle2, Circle, Clock, MapPin } from 'lucide-react'

const tabs = [
  { label: 'Customer', Icon: User },
  { label: 'Delivery Agent', Icon: Bike },
  { label: 'Admin', Icon: Settings2 },
]

const orders = [
  { id: '#SW-2847', item: 'Electronics Package', from: 'Warehouse A', status: 'delivered', eta: 'Delivered' },
  { id: '#SW-2901', item: 'Groceries Bundle', from: 'Hub Central', status: 'transit', eta: '14 min' },
  { id: '#SW-2956', item: 'Fashion Order', from: 'Sorting Hub', status: 'pickup', eta: '45 min' },
  { id: '#SW-3001', item: 'Books & Stationery', from: 'Warehouse B', status: 'placed', eta: '2.1 hrs' },
]

const agentOrders = [
  { id: '#SW-2901', destination: '42 MG Road, Bengaluru', distance: '2.3 km', status: 'transit', priority: 'High' },
  { id: '#SW-2956', destination: '18 Park Street, Delhi', distance: '5.1 km', status: 'pickup', priority: 'Medium' },
  { id: '#SW-3012', destination: '7 Sea View, Mumbai', distance: '8.7 km', status: 'placed', priority: 'Low' },
]

const adminMetrics = [
  { label: 'Total Orders', value: '4,821', cls: 'metric-blue', delta: '+214 today' },
  { label: 'Active Agents', value: '382', cls: 'metric-green', delta: '↑ 12%' },
  { label: 'Avg. ETA', value: '28m', cls: 'metric-orange', delta: '-4m vs last week' },
]

function StatusBadge({ status }) {
  const map = {
    delivered: { cls: 'status-delivered', label: 'Delivered', Icon: CheckCircle2 },
    transit: { cls: 'status-transit', label: 'In Transit', Icon: MapPin },
    pickup: { cls: 'status-pickup', label: 'Pickup', Icon: Clock },
    placed: { cls: 'status-placed', label: 'Placed', Icon: Circle },
  }
  const s = map[status] || map.placed
  const SIcon = s.Icon
  return (
    <span className={`order-status-badge ${s.cls}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <SIcon size={10} strokeWidth={2.5} />
      {s.label}
    </span>
  )
}

export default function Dashboards() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <section className="dashboards" id="dashboards">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-label">Dashboards</div>
          <h2>Built for <span className="gradient-text">Every Role</span></h2>
          <p>One platform, three purpose-built views — each person gets exactly what they need, nothing more.</p>
        </div>

        <div className="tab-switcher reveal">
          {tabs.map((tab, i) => {
            const TabIcon = tab.Icon
            return (
              <button
                key={tab.label}
                className={`tab-btn ${activeTab === i ? 'active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                <TabIcon size={14} strokeWidth={2} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="dashboard-preview reveal" style={{ transitionDelay: '0.2s' }}>
          <div className="dashboard-header">
            <div className="dash-dots">
              <div className="dash-dot" /><div className="dash-dot" /><div className="dash-dot" />
            </div>
            <span className="dash-title">SwiftRoute — {tabs[activeTab].label} Dashboard</span>
            <span style={{ fontSize: '12px', color: 'var(--accent-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-tertiary)', display: 'inline-block', animation: 'livePulse 1.5s infinite' }} />
              Live
            </span>
          </div>

          {/* Customer View */}
          <div className={`dashboard-body ${activeTab === 0 ? 'active' : ''}`}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>My Orders</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>4 active orders · Last updated just now</p>
            </div>
            <div className="dash-orders-list">
              {orders.map(order => (
                <div key={order.id} className="dash-order-row">
                  <span className="order-id">{order.id}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{order.item}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>From {order.from}</span>
                  <StatusBadge status={order.status} />
                  <span style={{ fontSize: '12px', fontWeight: '600', color: order.status === 'delivered' ? 'var(--accent-tertiary)' : 'var(--text-primary)' }}>
                    {order.eta}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Agent View */}
          <div className={`dashboard-body ${activeTab === 1 ? 'active' : ''}`}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {[
                { label: "Today's Deliveries", value: '12', color: 'var(--accent-tertiary)' },
                { label: 'Pending', value: '3', color: 'var(--accent-primary)' },
                { label: 'Earnings', value: '₹1,240', color: 'var(--accent-warm)' },
              ].map(m => (
                <div key={m.label} className="dash-metric" style={{ flex: '1', minWidth: '140px' }}>
                  <div className="dash-metric-label">{m.label}</div>
                  <div className="dash-metric-value" style={{ fontSize: '24px', color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
            <div className="dash-orders-list">
              {agentOrders.map(order => (
                <div key={order.id} className="dash-order-row">
                  <span className="order-id">{order.id}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} color="var(--accent-primary)" /> {order.destination}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.distance}</span>
                  <span style={{
                    padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700',
                    background: order.priority === 'High' ? 'rgba(255,60,60,0.12)' : order.priority === 'Medium' ? 'rgba(255,200,60,0.12)' : 'rgba(255,255,255,0.06)',
                    color: order.priority === 'High' ? '#ff3c3c' : order.priority === 'Medium' ? '#ffc83c' : 'var(--text-muted)',
                  }}>{order.priority}</span>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Admin View */}
          <div className={`dashboard-body ${activeTab === 2 ? 'active' : ''}`}>
            <div className="dash-grid">
              {adminMetrics.map(m => (
                <div key={m.label} className="dash-metric">
                  <div className="dash-metric-label">{m.label}</div>
                  <div className={`dash-metric-value ${m.cls}`}>{m.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{m.delta}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Delivery Volume — Last 7 Days
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '80px' }}>
                {[65, 78, 82, 71, 95, 88, 100].map((h, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '100%', height: `${h}%`, borderRadius: '4px 4px 0 0',
                      background: i === 6 ? 'linear-gradient(to top, var(--accent-primary), var(--accent-tertiary))' : 'rgba(0,212,255,0.15)',
                    }} />
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
