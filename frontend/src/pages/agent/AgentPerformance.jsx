import { useState, useEffect } from 'react'
import { Star, Package, Clock, TrendingUp, Award, Zap } from 'lucide-react'
import DashboardLayout from '../../components/DashboardLayout'
import AnimatedCounter from '../../components/ui/AnimatedCounter'
import { SkeletonCard } from '../../components/ui/SkeletonLoader'
import { useAuth } from '../../context/AuthContext'
import { agentAPI } from '../../services/api'
import { useToast } from '../../components/ui/Toast'

export default function AgentPerformance() {
  const { token, user } = useAuth()
  const toast = useToast()
  const [performance, setPerformance] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    agentAPI.getPerformance(token).then((res) => {
      if (res.success) setPerformance(res.data)
      setLoading(false)
    }).catch(() => {
      toast.error('Failed to load performance metrics')
      setLoading(false)
    })
  }, [token, toast])

  const metrics = performance ? [
    { label: 'Deliveries Today', value: performance.deliveriesToday || 0, icon: Package, color: '#6366f1', suffix: '' },
    { label: 'Average Rating', value: performance.avgRating || 0, icon: Star, color: '#fbbf24', suffix: ' / 5' },
    { label: 'On-Time Rate', value: performance.onTimeRate || 0, icon: TrendingUp, color: '#34d399', suffix: '%' },
  ] : []

  const onTimeRate = performance?.onTimeRate || 0
  const avgRating = performance?.avgRating || 0

  return (
    <DashboardLayout role="agent">
      <div className="dash-page">
        <div className="dash-page-header">
          <div>
            <h2 className="dash-page-title">My Performance</h2>
            <p className="dash-page-sub">Track your delivery metrics and ratings</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {metrics.map((m, idx) => {
                const Icon = m.icon
                return (
                  <div key={m.label} className="glass-card stagger-list" style={{ padding: '2rem', borderRadius: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', animation: `staggerUp 0.35s ${idx * 0.1}s both`, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: `radial-gradient(circle, ${m.color}20 0%, transparent 70%)`, borderRadius: '50%' }} />
                    <div style={{ width: 64, height: 64, background: `${m.color}15`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: `0 8px 24px ${m.color}15` }}>
                      <Icon size={28} color={m.color} />
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', marginBottom: '0.25rem', lineHeight: 1, letterSpacing: '-0.03em' }}>
                      <AnimatedCounter value={m.value} duration={1500} suffix={m.suffix} />
                    </div>
                    <div style={{ color: 'rgba(245,245,247,0.5)', fontSize: '0.9rem', fontWeight: 600 }}>{m.label}</div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
              
              {/* On-Time Progress */}
              <div className="glass-card stagger-list" style={{ padding: '2rem', borderRadius: 24, animation: 'staggerUp 0.4s 0.3s both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(52,211,153,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={18} color="#34d399" />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>On-Time Delivery Rate</h3>
                </div>
                
                <div style={{ position: 'relative', height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden', marginBottom: '1rem' }}>
                  <div style={{ 
                    position: 'absolute', left: 0, top: 0, bottom: 0, 
                    width: `${onTimeRate}%`, 
                    background: 'linear-gradient(90deg, #6366f1, #34d399)', 
                    borderRadius: 999, 
                    transition: 'width 1.5s cubic-bezier(0.25,0.46,0.45,0.94) 0.5s',
                    boxShadow: '0 0 12px rgba(52,211,153,0.5)'
                  }} />
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'rgba(245,245,247,0.4)', fontWeight: 600 }}>
                  <span>Needs Work</span>
                  <span style={{ color: onTimeRate >= 90 ? '#34d399' : '#fbbf24', fontWeight: 700, fontSize: '1.25rem' }}><AnimatedCounter value={onTimeRate} suffix="%" /></span>
                  <span>Excellent</span>
                </div>
              </div>

              {/* Rating Detailed */}
              <div className="glass-card stagger-list" style={{ padding: '2rem', borderRadius: 24, animation: 'staggerUp 0.4s 0.4s both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={18} color="#fbbf24" />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Customer Rating Breakdown</h3>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
                      <AnimatedCounter value={avgRating} />
                    </div>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', margin: '0.5rem 0' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={18} 
                          color={star <= Math.round(avgRating) ? '#fbbf24' : 'rgba(255,255,255,0.1)'}
                          fill={star <= Math.round(avgRating) ? '#fbbf24' : 'none'} 
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(245,245,247,0.4)' }}>
                      Based on {Object.values(performance?.ratingBreakdown || {}).reduce((a, b) => a + b, 0)} ratings
                    </div>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = performance?.ratingBreakdown?.[star] || 0;
                      const totalRatings = Object.values(performance?.ratingBreakdown || {}).reduce((a, b) => a + b, 0) || 1;
                      const pct = Math.round((count / totalRatings) * 100);
                      
                      return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(245,245,247,0.5)', width: 45 }}>{star} Stars</span>
                        <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: '#fbbf24', borderRadius: 3, transition: 'width 1s ease 0.8s' }} />
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(245,245,247,0.4)', width: 25, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    )})}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
