import { useState, useEffect } from 'react'
import { Bell, Package, Truck, Info } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import EmptyState from '../../components/ui/EmptyState'
import { SkeletonCard } from '../../components/ui/SkeletonLoader'
import { useAuth } from '../../context/AuthContext'
import { notificationAPI } from '../../services/api'
import { useToast } from '../../components/ui/Toast'

export default function Notifications() {
  const { token } = useAuth()
  const toast = useToast()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notificationAPI.getAll(token)
      .then((res) => {
        if (res.statusCode === 200) setNotifications(res.data)
        setLoading(false)
      })
      .catch(() => {
        toast.error('Connection Error', 'Failed to load notifications.')
        setLoading(false)
      })
  }, [token, toast])

  const typeIcon = { status_update: Package, assignment: Truck, info: Info }
  const typeColor = { status_update: '#00d4ff', assignment: '#a78bfa', info: '#fbbf24' }

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    toast.success('Marked as read', 'All notifications have been marked as read.')
    // In a real app, call API to mark all as read
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <DashboardLayout>
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">Notifications</h2>
            <p className="dash-page-sub">Stay updated on your deliveries and account activity</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="btn-ghost" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: 10 }}>
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 640 }}>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ maxWidth: 640 }}>
            <div className="glass-card dash-empty" style={{ borderRadius: 24, padding: '4rem 2rem' }}>
              <Bell size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>All caught up!</p>
              <p style={{ color: 'rgba(240,240,255,0.4)', marginTop: '0.5rem' }}>You have no new notifications.</p>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 640 }}>
            {notifications.map((n, idx) => {
              const Icon = typeIcon[n.type] || Bell
              const color = typeColor[n.type] || '#00d4ff'
              return (
                <div 
                  key={n._id} 
                  className="glass-card" 
                  style={{ 
                    padding: '1.25rem 1.5rem', 
                    borderRadius: 18, 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '1.25rem', 
                    opacity: n.isRead ? 0.6 : 1,
                    transition: 'all 0.2s',
                    animation: `staggerUp 0.3s ${idx * 0.05}s both`,
                    borderLeft: !n.isRead ? `3px solid ${color}` : '1px solid rgba(255,255,255,0.08)'
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.95rem', fontWeight: n.isRead ? 500 : 700, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                      {n.message}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(240,240,255,0.4)', fontWeight: 500 }}>
                      {new Date(n.createdAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, marginTop: '0.4rem', boxShadow: `0 0 12px ${color}` }} />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
