import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap, LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', role: 'customer' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await authAPI.login(form)
      if (res.statusCode === 200) {
        login(res.data.user, res.data.accessToken)
        const role = res.data.user.role
        if (role === 'admin') navigate('/admin')
        else if (role === 'agent') navigate('/agent')
        else navigate('/dashboard')
      } else {
        setError(res.message || 'Login failed')
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
      <div className="bg-blob bg-blob-2" />

      <div className="auth-wrapper">
        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#fff', textDecoration: 'none', marginBottom: '1.5rem', fontWeight: 700, fontSize: '1.25rem' }}>
              <div style={{ background: 'var(--color-surface)' }}>
                <Zap size={20} strokeWidth={2.5} color="#fff" />
              </div>
              SwiftRoute
            </Link>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0.5rem 0 0.25rem', fontFamily: 'var(--font-display)' }}>Welcome back</h1>
            <p style={{ color: 'rgba(240,240,255,0.5)', fontSize: '0.9rem' }}>Sign in to access your dashboard</p>
          </div>

          <div className="glass-card auth-card">
            {/* Role Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', background: 'rgba(255,255,255,0.04)', padding: '4px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.08)' }}>
              {['customer', 'agent', 'admin'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setForm({ ...form, role: r })}
                  style={{
                    flex: 1, padding: '0.5rem', borderRadius: '50px', border: 'none', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', transition: '0.2s',
                    background: form.role === r ? 'linear-gradient(135deg,#6366f1,#0077ff)' : 'transparent',
                    color: form.role === r ? '#fff' : 'rgba(240,240,255,0.4)',
                  }}
                >
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
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(240,240,255,0.6)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="dash-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'rgba(240,240,255,0.6)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="dash-input"
                    style={{ paddingRight: '3rem' }}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(240,240,255,0.4)' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem', padding: '0.875rem', opacity: loading ? 0.7 : 1 }}>
                {loading ? <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> : <LogIn size={16} />}
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </form>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'rgba(240,240,255,0.4)' }}>
              Don't have an account?{' '}
              <Link to="/signup" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
