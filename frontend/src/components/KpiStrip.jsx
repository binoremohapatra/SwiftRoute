import { useEffect, useRef, useState } from 'react'
import { TrendingUp, Activity, Timer, Crosshair } from 'lucide-react'

const kpis = [
  { value: 98.7, suffix: '%', label: 'On-Time Delivery Rate', sub: 'industry avg. 91%', Icon: TrendingUp },
  { value: 47382, suffix: '', label: 'Active Deliveries', sub: 'right now, globally', Icon: Activity },
  { value: 28, suffix: 'min', label: 'Avg. Delivery Time', sub: '-34% vs last year', Icon: Timer },
  { value: 99.96, suffix: '%', label: 'Tracking Accuracy', sub: 'sub-10m GPS precision', Icon: Crosshair },
]

function useCountUp(target, duration = 2000, active) {
  const [count, setCount] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!active) return
    let start = null
    const isDecimal = target % 1 !== 0

    const step = (timestamp) => {
      if (!start) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = eased * target
      setCount(isDecimal ? parseFloat(current.toFixed(2)) : Math.floor(current))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
      else setCount(target)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [active, target, duration])

  return count
}

function KpiItem({ kpi, active }) {
  const count = useCountUp(kpi.value, 2200, active)
  const KpiIcon = kpi.Icon
  return (
    <div className="kpi-item">
      <div style={{
        width: '44px', height: '44px', margin: '0 auto 16px',
        borderRadius: '12px',
        background: 'rgba(0,212,255,0.1)',
        border: '1px solid rgba(0,212,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <KpiIcon size={20} color="var(--accent-primary)" strokeWidth={1.75} />
      </div>
      <div className="kpi-number">
        {typeof count === 'number' && count % 1 !== 0 ? count.toFixed(2) : count.toLocaleString()}
        <span className="kpi-suffix">{kpi.suffix}</span>
      </div>
      <div className="kpi-label">{kpi.label}</div>
      <div className="kpi-sublabel">{kpi.sub}</div>
    </div>
  )
}

export default function KpiStrip() {
  const [active, setActive] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setActive(true) },
      { threshold: 0.4 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section className="kpi-strip" id="kpi" ref={sectionRef}>
      <div className="container">
        <div className="section-header reveal">
          <div className="section-label">Impact</div>
          <h2>Numbers That <span className="gradient-text">Move Fast</span></h2>
        </div>
        <div className="kpi-inner reveal" style={{ transitionDelay: '0.2s' }}>
          <div className="kpi-grid">
            {kpis.map((kpi, i) => (
              <KpiItem key={i} kpi={kpi} active={active} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
