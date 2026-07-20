import { useEffect, useRef } from 'react'
import { Radio, ArrowRight, Play, TrendingUp, Clock, Package } from 'lucide-react'
import MapVisual from './MapVisual'

export default function Hero() {
  const bgRef = useRef(null)

  useEffect(() => {
    const onScroll = () => {
      if (!bgRef.current) return
      bgRef.current.style.transform = `translateY(${window.scrollY * 0.3}px)`
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <section className="hero" id="hero">
      <div className="hero-bg" ref={bgRef}>
        <div className="hero-grid" />
        <div className="hero-radial" />
      </div>

      <div className="container" style={{ position: 'relative', zIndex: 2, width: '100%' }}>
        <div className="hero-content reveal">
          {/* Live badge */}
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <Radio size={11} strokeWidth={2.5} />
            Live tracking — now streaming 47,382 deliveries
          </div>

          <h1>
            Every Package,{' '}
            <span className="gradient-text">Every Second</span>
            <br />
            In Motion.
          </h1>

          <p className="hero-sub">
            SwiftRoute unifies real-time delivery tracking, intelligent order
            management, and role-based dashboards into one beautifully
            engineered logistics platform.
          </p>

          <div className="hero-cta">
            <a href="#footer-cta" className="btn-primary" id="hero-cta-primary">
              Start Tracking Free
              <ArrowRight size={16} />
            </a>
            <a href="#how-it-works" className="btn-ghost">
              <Play size={14} fill="currentColor" />
              Watch Demo
            </a>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} color="var(--accent-primary)" />
                <span className="hero-stat-number">99.8%</span>
              </div>
              <span className="hero-stat-label">Uptime SLA</span>
            </div>
            <div className="hero-stat">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color="var(--accent-primary)" />
                <span className="hero-stat-number">2.3s</span>
              </div>
              <span className="hero-stat-label">Avg. Update Freq</span>
            </div>
            <div className="hero-stat">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Package size={16} color="var(--accent-primary)" />
                <span className="hero-stat-number">500K+</span>
              </div>
              <span className="hero-stat-label">Daily Deliveries</span>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-visual">
        <MapVisual />
      </div>
    </section>
  )
}
