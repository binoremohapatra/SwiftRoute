import { useEffect, useRef } from 'react'
import { MapPin, PackageCheck, LayoutDashboard, BellRing } from 'lucide-react'

const features = [
  {
    Icon: MapPin,
    cls: 'feature-icon-1',
    title: 'Live GPS Tracking',
    desc: 'Sub-3-second location updates via WebSocket connections. Watch agents move on a live map in real time.',
    tags: ['WebSockets', 'Google Maps', 'Real-time'],
    accent: '#00d4ff',
  },
  {
    Icon: PackageCheck,
    cls: 'feature-icon-2',
    title: 'Order Lifecycle Manager',
    desc: 'Full-lifecycle tracking from placement to delivery with automated state transitions and audit trails.',
    tags: ['State Machine', 'REST API', 'Webhooks'],
    accent: '#00ffaa',
  },
  {
    Icon: LayoutDashboard,
    cls: 'feature-icon-3',
    title: 'Admin Control Panel',
    desc: 'Manage agents, zones, and orders from a unified dashboard with role-based access controls.',
    tags: ['RBAC', 'Analytics', 'Dashboard'],
    accent: '#ff6b35',
  },
  {
    Icon: BellRing,
    cls: 'feature-icon-4',
    title: 'Smart Notifications',
    desc: 'Automated push, SMS, and email at every status change. Configurable per customer preference.',
    tags: ['Push', 'SMS', 'Email', 'Webhooks'],
    accent: '#8c3cff',
  },
]

export default function Features() {
  const cardsRef = useRef([])

  useEffect(() => {
    const handleMouseMove = (e, card) => {
      const rect = card.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      card.style.setProperty('--mx', `${x}%`)
      card.style.setProperty('--my', `${y}%`)
    }

    cardsRef.current.forEach(card => {
      if (!card) return
      const handler = (e) => handleMouseMove(e, card)
      card.addEventListener('mousemove', handler)
      card._handler = handler
    })

    return () => {
      cardsRef.current.forEach(card => {
        if (!card || !card._handler) return
        card.removeEventListener('mousemove', card._handler)
      })
    }
  }, [])

  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-header reveal">
          <div className="section-label">Features</div>
          <h2>Built for <span className="gradient-text">Every Second</span> of Delivery</h2>
          <p>Four pillars that transform how logistics teams operate, track, and deliver.</p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-card reveal"
              ref={el => cardsRef.current[i] = el}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className={`feature-icon ${f.cls}`}>
                <f.Icon size={24} color={f.accent} strokeWidth={1.75} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <div className="feature-tags">
                {f.tags.map(tag => (
                  <span key={tag} className="feature-tag" style={{
                    background: `${f.accent}14`,
                    borderColor: `${f.accent}30`,
                    color: f.accent,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div style={{
                marginTop: '20px',
                fontSize: '13px',
                color: f.accent,
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: 0.7,
              }}>
                Learn more →
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
