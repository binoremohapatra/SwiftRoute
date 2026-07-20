import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import {
  LayoutDashboard, Package, MapPin, Bell, Users, LogOut,
  Menu, X, Zap, Shield, Truck, TrendingUp, ChevronLeft,
  ChevronRight, Sun, Moon, Search, Settings, User, Map
} from 'lucide-react'

/* ──────────── Nav Config ──────────── */
const navConfig = {
  customer: [
    { label: 'Dashboard',    href: '/dashboard',                icon: LayoutDashboard },
    { label: 'My Orders',    href: '/dashboard/orders',         icon: Package },
    { label: 'Track Order',  href: '/dashboard/track',          icon: MapPin },
    { label: 'Notifications',href: '/dashboard/notifications',  icon: Bell },
  ],
  agent: [
    { label: 'Dashboard',    href: '/agent',                    icon: LayoutDashboard },
    { label: 'Deliveries',   href: '/agent/deliveries',         icon: Package },
    { label: 'Performance',  href: '/agent/performance',        icon: TrendingUp },
  ],
  admin: [
    { label: 'Dashboard',    href: '/admin',                    icon: LayoutDashboard },
    { label: 'Orders',       href: '/admin/orders',             icon: Package },
    { label: 'Live Tracking',href: '/admin/tracking',           icon: Map },
    { label: 'Assign Orders',href: '/admin/assign',             icon: MapPin },
    { label: 'Users & Agents',href: '/admin/users',            icon: Users },
    { label: 'Analytics',    href: '/admin/analytics',          icon: TrendingUp },
  ],
}

const roleIcons   = { customer: User, agent: Truck, admin: Shield }
const roleLabel   = { customer: 'Customer', agent: 'Delivery Agent', admin: 'Administrator' }
const roleAccent  = { customer: '#6366f1', agent: '#818cf8', admin: '#f59e0b' }

/* ──────────── DashboardLayout ──────────── */
export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth()
  const location         = useLocation()
  const navigate         = useNavigate()

  const [sidebarOpen,    setSidebarOpen]    = useState(false)
  const [collapsed,      setCollapsed]      = useState(false)
  const [profileOpen,    setProfileOpen]    = useState(false)
  const [theme,          setTheme]          = useState('dark')
  const [notifCount]                        = useState(3)

  const profileRef = useRef(null)
  const navLinks   = navConfig[user?.role] || []
  const RoleIcon   = roleIcons[user?.role] || User
  const accent     = roleAccent[user?.role] || '#6366f1'

  /* Theme toggle */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  /* Close profile dropdown on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* Close mobile sidebar on route change */
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    try { await authAPI.logout() } catch {}
    logout()
    navigate('/')
  }

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  /* ─── Mobile bottom nav ─── */
  const mobileNavLinks = navLinks.slice(0, 5)

  return (
    <div className="dash-layout">
      {/* ═══ SIDEBAR ═══ */}
      <aside className={`dash-sidebar${collapsed ? ' collapsed' : ''}${sidebarOpen ? ' open' : ''}`}>
        {/* Header */}
        <div className="dash-sidebar-header">
          <Link to="/" className="dash-logo">
            <div className="logo-icon">
              <Zap size={15} strokeWidth={2.5} color="#fff" />
            </div>
            <span className="dash-logo-text">SwiftRoute</span>
          </Link>
          {/* Desktop collapse button */}
          <button
            className="dash-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed
              ? <ChevronRight size={16} />
              : <ChevronLeft  size={16} />
            }
          </button>
          {/* Mobile close button */}
          <button className="dash-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* User card */}
        <div className="dash-user-card">
          <div
            className="dash-avatar"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
          >
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="dash-user-info">
            <div className="dash-user-name">{user?.name}</div>
            <div className="dash-user-role">
              <RoleIcon size={11} />
              {roleLabel[user?.role] || user?.role}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="dash-nav">
          {navLinks.map((link) => {
            const Icon     = link.icon
            const isActive = location.pathname === link.href ||
                             (link.href !== '/' && location.pathname.startsWith(link.href + '/') && link.href.length > 4)
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`dash-nav-link${isActive ? ' active' : ''}`}
                title={collapsed ? link.label : undefined}
              >
                <span className="dash-nav-link-icon">
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span className="dash-nav-link-label">{link.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="dash-sidebar-footer">
          <button className="dash-logout-btn" onClick={handleLogout}>
            <LogOut size={16} />
            <span className="dash-logout-label">Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="dash-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══ MAIN ═══ */}
      <div className="dash-main">
        {/* Top bar */}
        <header className="dash-topbar">
          <div className="dash-topbar-left">
            <button
              className="dash-menu-btn"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="dash-topbar-search">
              <Search size={14} color="rgba(245,245,247,0.3)" />
              <input placeholder="Search orders, agents..." />
            </div>
          </div>

          <div className="dash-topbar-right">
            {/* Live indicator */}
            <div className="dash-live-indicator">
              <div className="dash-status-dot" />
              <span>Live</span>
            </div>

            {/* Theme toggle */}
            <button className="dash-theme-btn" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark'
                ? <Sun  size={16} />
                : <Moon size={16} />
              }
            </button>

            {/* Notification bell */}
            <Link to={user?.role === 'customer' ? '/dashboard/notifications' : '#'} className="dash-notif-btn">
              <Bell size={16} />
              {notifCount > 0 && (
                <span className="dash-notif-badge">{notifCount}</span>
              )}
            </Link>

            {/* Profile dropdown */}
            <div className="dash-profile-wrap" ref={profileRef}>
              <button
                className="dash-profile-btn"
                onClick={() => setProfileOpen(o => !o)}
              >
                <div
                  className="dash-profile-avatar"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
                >
                  {user?.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="dash-profile-name">{user?.name?.split(' ')[0]}</span>
                <ChevronRight
                  size={14}
                  color="rgba(245,245,247,0.4)"
                  style={{ transform: profileOpen ? 'rotate(90deg)' : 'rotate(0)', transition: '0.2s' }}
                />
              </button>

              {profileOpen && (
                <div className="dash-dropdown">
                  <div style={{ padding: '0.5rem 0.75rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {user?.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(245,245,247,0.35)' }}>{user?.email}</div>
                  </div>
                  <button className="dash-dropdown-item">
                    <User size={15} /> My Profile
                  </button>
                  <button className="dash-dropdown-item" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </button>
                  <div className="dash-dropdown-divider" />
                  <button className="dash-dropdown-item danger" onClick={handleLogout}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="dash-content">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="mobile-bottom-nav">
          {mobileNavLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.href
            return (
              <Link
                key={link.href}
                to={link.href}
                className={`mobile-nav-item${isActive ? ' active' : ''}`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span>{link.label.split(' ')[0]}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
