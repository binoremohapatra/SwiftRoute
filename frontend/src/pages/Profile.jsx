import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import { User, Mail, Shield, Calendar, ShieldCheck } from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()

  // Format date if available
  const joinedDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently joined'

  return (
    <DashboardLayout title="My Profile" role={user?.role}>
      <div className="dash-container" style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'staggerUp 0.5s ease both' }}>
          
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-indigo), #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', boxShadow: '0 8px 24px rgba(99,102,241,0.2)' }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {user?.name || 'User'}
          </h1>
          <div style={{ fontSize: '0.9rem', color: 'rgba(240,240,255,0.5)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <Mail size={14} /> {user?.email || 'user@example.com'}
          </div>

          <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: '2rem' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', width: '100%', textAlign: 'left' }}>
            
            <div style={{ background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(240,240,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                <Shield size={14} /> Account Role
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                {user?.role || 'Customer'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(240,240,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                <Calendar size={14} /> Member Since
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {joinedDate}
              </div>
            </div>

            <div style={{ background: 'var(--bg-elevated)', padding: '1.25rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'rgba(240,240,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                <ShieldCheck size={14} /> Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', fontWeight: 600, color: '#10b981' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Active
              </div>
            </div>

          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
