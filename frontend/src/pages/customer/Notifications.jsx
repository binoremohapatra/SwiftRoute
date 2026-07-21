import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Package, Truck, Info, Check, Trash2, Settings, CreditCard, Gift, Mail, Smartphone, XCircle } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import { SkeletonCard } from '../../components/ui/SkeletonLoader'
import { useAuth } from '../../context/AuthContext'
import { notificationAPI } from '../../services/api'
import { io } from 'socket.io-client'

// Simple Toast component (inline since no library)
const Toast = ({ msg, type, onClose }) => {
  if (!msg) return null;
  const isError = type === 'error';
  return (
    <div style={{
      position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999,
      background: isError ? '#ef4444' : '#10b981', color: '#fff',
      padding: '0.75rem 1.25rem', borderRadius: 8, display: 'flex', 
      alignItems: 'center', gap: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      animation: 'staggerUp 0.3s ease both'
    }}>
      {isError ? <XCircle size={18} /> : <Check size={18} />}
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{msg}</span>
    </div>
  )
}

// Toggle Switch Component
const Toggle = ({ label, checked, onChange, icon: Icon }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {Icon && <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: 8, color: 'var(--text-secondary)' }}><Icon size={14} /></div>}
      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{label}</span>
    </div>
    <div 
      onClick={() => onChange(!checked)}
      style={{ 
        width: 44, height: 24, borderRadius: 12, background: checked ? '#10b981' : 'rgba(255,255,255,0.1)',
        position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, 
        left: checked ? 23 : 3, transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }} />
    </div>
  </div>
)

export default function Notifications() {
  const { user, token } = useAuth()
  
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, unread, ORDER_UPDATE, PAYMENT
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const [toast, setToast] = useState({ msg: '', type: '' })
  
  // Preferences State
  const [showPreferences, setShowPreferences] = useState(false)
  const [prefs, setPrefs] = useState({
    orderUpdates: true, paymentAlerts: true, promotions: false, pushEnabled: true, emailEnabled: false
  })

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: '' }), 3000);
  }, []);

  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      if (reset) setLoading(true);
      
      const res = await notificationAPI.getAll(token, { page: currentPage, limit: 20, filter });
      
      setNotifications(prev => reset ? res.data.data : [...prev, ...res.data.data]);
      setHasMore(currentPage < res.data.pagination.totalPages);
      if (reset) setPage(1);
    } catch (err) {
      showToast('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, filter, page, showToast]);

  useEffect(() => {
    fetchNotifications(true);
  }, [filter, token]);

  useEffect(() => {
    // Fetch preferences
    notificationAPI.getPreferences(token).then(res => {
      setPrefs(res.data);
    }).catch(console.error);
  }, [token]);

  useEffect(() => {
    // Socket.io real-time
    const socket = io('http://localhost:5000');
    socket.emit('authenticate', token);
    
    socket.on('notification:new', (notif) => {
      if (filter === 'all' || filter === 'unread' || filter === notif.type) {
        setNotifications(prev => [notif, ...prev]);
      }
    });

    return () => socket.disconnect();
  }, [token, filter]);

  const handleTogglePref = async (key, val) => {
    const newPrefs = { ...prefs, [key]: val };
    setPrefs(newPrefs);
    try {
      await notificationAPI.updatePreferences({ [key]: val }, token);
    } catch (err) {
      setPrefs(prefs); // revert
      showToast('Failed to save preference', 'error');
    }
  }

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id, token);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      showToast('Failed to mark read', 'error');
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead(token);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      showToast('All marked as read');
    } catch (err) {
      showToast('Failed to mark all read', 'error');
    }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation(); // prevent markRead if clicking body
    try {
      await notificationAPI.deleteNotification(id, token);
      setNotifications(prev => prev.filter(n => n.id !== id));
      showToast('Notification deleted');
    } catch (err) {
      showToast('Failed to delete', 'error');
    }
  }

  const typeIcon = { 
    'ORDER_UPDATE': Package, 
    'status_update': Package, 
    'assignment': Truck, 
    'PAYMENT': CreditCard, 
    'delivery': Check, 
    'info': Info,
    'NEW_DISPATCH': Package,
    'ACCOUNT_ALERT': Info,
    'ORDER_CANCELLED_BY_ADMIN': XCircle,
    'PERFORMANCE_UPDATE': Settings
  }

  const filterTabs = user?.role === 'agent' 
    ? ['all', 'unread', 'NEW_DISPATCH', 'ACCOUNT_ALERT'] 
    : ['all', 'unread', 'ORDER_UPDATE', 'PAYMENT'];

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <DashboardLayout title="Notifications" role={user?.role}>
      <Toast msg={toast.msg} type={toast.type} onClose={() => setToast({ msg: '', type: '' })} />

      <div className="dash-container" style={{ maxWidth: 800, margin: '0 auto', padding: '1rem', paddingBottom: '3.5rem' }}>
        
        {/* Header Area */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', paddingLeft: '0.5rem' }}>
          <div>
            <h1 className="dash-page-title" style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>Notifications</h1>
            <p className="dash-page-sub" style={{ fontSize: '0.8rem', opacity: 0.7 }}>Recent updates on your account</p>
          </div>
          <button 
            onClick={() => setShowPreferences(!showPreferences)} 
            style={{ background: showPreferences ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)', color: showPreferences ? 'var(--accent-indigo)' : 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', flexShrink: 0 }}
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Preferences Section (Collapsible) */}
        {showPreferences && (
          <div className="glass-card" style={{ padding: '1rem', borderRadius: 16, marginBottom: '1rem', animation: 'staggerUp 0.3s ease both' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Notification Settings</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1.5rem' }}>
              <Toggle label="Order Updates" icon={Package} checked={prefs.orderUpdates} onChange={(v) => handleTogglePref('orderUpdates', v)} />
              <Toggle label="Payment Alerts" icon={CreditCard} checked={prefs.paymentAlerts} onChange={(v) => handleTogglePref('paymentAlerts', v)} />
              <Toggle label="Promotions & Offers" icon={Gift} checked={prefs.promotions} onChange={(v) => handleTogglePref('promotions', v)} />
              <Toggle label="Push Notifications" icon={Smartphone} checked={prefs.pushEnabled} onChange={(v) => handleTogglePref('pushEnabled', v)} />
              <Toggle label="Email Notifications" icon={Mail} checked={prefs.emailEnabled} onChange={(v) => handleTogglePref('emailEnabled', v)} />
            </div>
          </div>
        )}

        {/* Tabs & Actions */}
        <div className="notif-controls-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
          <div className="hide-scrollbar" style={{ display: 'flex', justifyContent: 'center', gap: '0.2rem', background: 'rgba(255,255,255,0.03)', padding: '0.25rem', borderRadius: 12, overflowX: 'auto', whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.05)', maxWidth: '100%' }}>
            {filterTabs.map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? 'var(--accent-primary)' : 'transparent',
                  color: filter === f ? '#fff' : 'var(--text-secondary)',
                  border: 'none', padding: '0.4rem 0.5rem', borderRadius: 8, fontSize: '0.65rem', fontWeight: filter === f ? 600 : 500, cursor: 'pointer',
                  textTransform: 'capitalize', flexShrink: 0, transition: 'all 0.2s'
                }}
              >
                {f.toLowerCase().replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderRadius: 8, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', border: '1px solid rgba(99, 102, 241, 0.2)', whiteSpace: 'nowrap', fontWeight: 600, cursor: 'pointer' }}>
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card dash-empty" style={{ borderRadius: 24, padding: '4rem 2rem' }}>
            <div style={{ position: 'relative', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', marginBottom: '1rem' }}>
              <Bell size={28} style={{ opacity: 0.3 }} />
              <Check size={16} style={{ position: 'absolute', bottom: 10, right: 10, color: 'var(--accent-indigo)', background: 'var(--bg-card)', borderRadius: '50%' }} />
            </div>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>You're all caught up!</p>
            <p style={{ color: 'rgba(240,240,255,0.4)', marginTop: '0.5rem', maxWidth: 260, textAlign: 'center' }}>
              New updates about your orders and account will show up here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {notifications.map((n, idx) => {
              const Icon = typeIcon[n.type] || Bell
              return (
                <div 
                  key={n.id} 
                  className="glass-card notif-card" 
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  style={{ 
                    padding: '1rem', 
                    borderRadius: 14, 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '1rem', 
                    opacity: n.isRead ? 0.6 : 1,
                    transition: 'all 0.2s',
                    animation: `staggerUp 0.3s ${Math.min(idx, 10) * 0.05}s both`,
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: !n.isRead ? 'rgba(255,255,255,0.02)' : 'transparent',
                    cursor: !n.isRead ? 'pointer' : 'default',
                    position: 'relative'
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: !n.isRead ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={!n.isRead ? 'var(--accent-indigo)' : 'var(--text-secondary)'} />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '2rem' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: !n.isRead ? 600 : 400, marginBottom: '0.4rem', color: !n.isRead ? '#fff' : 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                      <span>{new Date(n.createdAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {n.orderId && (
                        <Link to={`/dashboard/track?id=${n.orderId}`} onClick={e => e.stopPropagation()} style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
                          View Order →
                        </Link>
                      )}
                    </div>
                  </div>

                  {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-primary)', position: 'absolute', left: '-4px', top: '50%', transform: 'translateY(-50%)' }} />}

                  <button 
                    onClick={(e) => handleDelete(n.id, e)}
                    style={{ position: 'absolute', right: '0.75rem', top: '1rem', background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.2)', cursor: 'pointer', padding: '0.25rem', borderRadius: 6, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    className="hover-bg-red"
                    title="Delete Notification"
                  >
                    <Trash2 size={16} />
                  </button>

                  <style>{`
                    .hover-bg-red:hover { background: rgba(239, 68, 68, 0.1) !important; color: #ef4444 !important; }
                  `}</style>
                </div>
              )
            })}
            
            {hasMore && (
              <button 
                onClick={() => { setPage(p => p + 1); fetchNotifications(); }}
                style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: 'none', padding: '0.75rem', borderRadius: 12, marginTop: '1rem', cursor: 'pointer' }}
              >
                Load More
              </button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
