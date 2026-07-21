import { useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/DashboardLayout'
import { User, Mail, Shield, Calendar, ShieldCheck, MapPin, CreditCard, Wallet, Building, Phone, Edit3 } from 'lucide-react'

export default function Profile() {
  const { user } = useAuth()

  // Format date if available
  const joinedDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently joined'

  const isAgent = user?.role === 'agent' || user?.role === 'delivery_agent'

  return (
    <DashboardLayout title="My Profile" role={user?.role}>
      <div className="dash-container" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: '3rem' }}>
        
        {/* TOP SUMMARY CARD */}
        <div className="glass-card" style={{ padding: '2.5rem', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: 'staggerUp 0.4s ease both', marginBottom: '1.5rem' }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-indigo), #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem', boxShadow: '0 8px 24px rgba(99,102,241,0.2)' }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {user?.name || 'User'}
          </h1>
          <div style={{ fontSize: '0.9rem', color: 'rgba(240,240,255,0.5)', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
            <Mail size={14} /> {user?.email || 'user@example.com'}
          </div>
        </div>

        {/* DETAILS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', animation: 'staggerUp 0.5s ease both' }}>
          
          {/* Account Overview */}
          <div className="glass-card" style={{ padding: '2rem', borderRadius: 20 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Shield size={18} color="var(--accent-indigo)" /> Account Overview
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Role</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{user?.role || 'Customer'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Member Since</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{joinedDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Active
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Address */}
          <div className="glass-card" style={{ padding: '2rem', borderRadius: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <MapPin size={18} color="var(--accent-indigo)" /> Address Details
              </h2>
              <button style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <Edit3 size={12} /> Edit
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10, color: 'var(--text-secondary)' }}>
                  <Phone size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Phone Number</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>+91 98765 43210</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ padding: '0.6rem', background: 'rgba(255,255,255,0.03)', borderRadius: 10, color: 'var(--text-secondary)' }}>
                  <Building size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Permanent Address</div>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Flat 402, Royal Residency,<br />
                    Andheri West, Mumbai, 400053
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="glass-card" style={{ padding: '2rem', borderRadius: 20 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CreditCard size={18} color="var(--accent-indigo)" /> Bank Details
              </h2>
              <button style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-primary)', padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <Edit3 size={12} /> Update
              </button>
            </div>
            
            <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', padding: '1.5rem', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -20, top: -20, opacity: 0.1 }}>
                <CreditCard size={100} />
              </div>
              <div style={{ fontSize: '0.85rem', color: 'rgba(240,240,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>HDFC Bank</div>
              <div style={{ fontSize: '1.25rem', fontFamily: 'monospace', color: 'var(--text-primary)', letterSpacing: '0.15em', marginBottom: '1rem' }}>
                •••• •••• •••• 4092
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>ACCOUNT HOLDER</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>{user?.name || 'USER NAME'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>IFSC CODE</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>HDFC0001234</div>
                </div>
              </div>
            </div>
          </div>

          {/* Earnings & Payouts (AGENT ONLY) */}
          {isAgent && (
            <div className="glass-card" style={{ padding: '2rem', borderRadius: 20 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Wallet size={18} color="#10b981" /> Earnings Overview
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(16, 185, 129, 0.8)', marginBottom: '0.5rem', fontWeight: 600 }}>Per Order Pay</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                    ₹40
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>This Month</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                    ₹12,500
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', padding: '1rem 1.25rem', borderRadius: 12, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--accent-indigo)', fontWeight: 700, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Payout</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                    ₹1,200
                  </div>
                </div>
                <button style={{ background: 'var(--accent-indigo)', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                  Withdraw
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  )
}
