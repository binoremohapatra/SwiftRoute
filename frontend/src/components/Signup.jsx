import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, UserPlus, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

const vehicleTypes = ['bike', 'scooter', 'van', 'truck']

export default function Signup() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'customer', vehicleType: 'bike' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = { ...form }
      if (form.role !== 'agent') delete payload.vehicleType
      const res = await authAPI.register(payload)
      if (res.statusCode === 201) {
        // Auto-login after register
        const loginRes = await authAPI.login({ email: form.email, password: form.password, role: form.role })
        if (loginRes.statusCode === 200) {
          login(loginRes.data.user, loginRes.data.accessToken)
          const role = loginRes.data.user.role
          if (role === 'admin') navigate('/admin')
          else if (role === 'agent') navigate('/agent')
          else navigate('/dashboard')
        }
      } else {
        setError(res.message || 'Registration failed')
      }
    } catch {
      setError('Server error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <div className="noise-overlay" />
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-3" />

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#fff', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 700, fontSize: '1.25rem' }}>
              <div style={{ background: 'linear-gradient(135deg,#00d4ff,#0077ff)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                <Zap size={20} strokeWidth={2.5} color="#fff" />
              </div>
              SwiftRoute
            </Link>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0 0.25rem', fontFamily: 'var(--font-display)' }}>Create account</h1>
            <p style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.9rem' }}>Join SwiftRoute and start delivering smarter</p>
          </div>

          <div className="glass-card" style={{ padding: '2.5rem', borderRadius: '24px' }}>
            {/* Role Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {['customer', 'agent', 'admin'].map((r) => (
                <button key={r} type="button" onClick={() => setForm({ ...form, role: r })}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '50px', border: 'none', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', transition: '0.2s',
                    background: form.role === r ? 'linear-gradient(135deg,#00d4ff,#0077ff)' : 'transparent',
                    color: form.role === r ? '#fff' : 'rgba(240,240,255,0.4)' }}>
                  {r}
                </button>
              ))}
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,100,100,0.1)', border: '1px solid rgba(255,100,100,0.2)', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1rem', color: '#ff6b6b', fontSize: '0.875rem' }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Doe" className="dash-input" />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 9999999999" className="dash-input" />
                </div>
              </div>

              <div>
                <label className="form-label">Email</label>
                <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="dash-input" />
              </div>

              <div>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 characters" className="dash-input" style={{ paddingRight: '3rem' }} />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(240,240,255,0.4)' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {form.role === 'agent' && (
                <div>
                  <label className="form-label">Vehicle Type</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    {vehicleTypes.map((v) => (
                      <button key={v} type="button" onClick={() => setForm({ ...form, vehicleType: v })}
                        style={{ padding: '0.5rem', borderRadius: '10px', border: `1px solid ${form.vehicleType === v ? '#00d4ff' : 'rgba(255,255,255,0.1)'}`,
                          background: form.vehicleType === v ? 'rgba(0,212,255,0.1)' : 'transparent', color: form.vehicleType === v ? '#00d4ff' : 'rgba(240,240,255,0.5)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize', transition: '0.2s' }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.875rem', opacity: loading ? 0.7 : 1 }}>
                {loading ? <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : <UserPlus size={16} />}
                {loading ? 'Creating account...' : 'Create account'}
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } } .form-label { display: block; font-size: 0.8rem; font-weight: 600; color: rgba(240,240,255,0.6); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }`}</style>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'rgba(240,240,255,0.4)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#00d4ff', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
